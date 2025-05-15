#!/bin/bash

# Exit on error
set -eu
set -o pipefail

###################
### VARIABLES #####
###################

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# App configuration
APP_NAME="wallet"
APP_NAME_CAPITALIZED="Wallet"
DEPLOYMENT_REPO="deployment-${APP_NAME}"

# Server configurations
MAINNET_SERVERS=("deploy_${APP_NAME}@web-1" "deploy_${APP_NAME}@web-2" "deploy_${APP_NAME}@web-3" "deploy_${APP_NAME}@web-4")
TESTNET_SERVERS=("deploy_${APP_NAME}@testnet-web1")
DEPLOY_SERVERS=()

# Default values
DEPLOYER=""
EXCLUDE_RELEASE=""
SYNC_TRANSLATIONS=true
BUILD_ENV=""
DEPLOY_ONLY=false
SAME_AS=""
VERSION_PROVIDED_BY_USER=false
DRY_RUN=false
VERSION=""
COMMIT_MSG=""

###################
### FUNCTIONS #####
###################

# Function to display usage message
show_usage() {
    local error_msg="${1:-}"

    if [ -n "$error_msg" ]; then
        echo -e "${RED}Error: $error_msg${NC}"
        echo
    fi

    echo -e "${BLUE}Usage: $0 <version_number> -m <commit_message> --deployer=NAME [OPTIONS]${NC}"
    echo
    echo -e "${CYAN}Required Arguments:${NC}"
    echo "  <version_number>        Version to deploy in X.Y.Z format (e.g., 3.0.10)"
    echo "                         Not required if using --deploy-only or --same-as"
    echo "  -m <commit_message>     Commit message for the deployment"
    echo "                         Required unless using --deploy-only"
    echo "  --deployer=NAME        Your name/identifier for the deployment"
    echo "                         Required unless using --deploy-only"
    echo "  --mainnet|--testnet    Target environment for deployment (must specify one)"
    echo
    echo -e "${CYAN}Optional Arguments:${NC}"
    echo "  --help                 Show this detailed help message"
    echo "  --exclude-release      Add [exclude-release] tag to exclude this deployment"
    echo "                         from release notes"
    echo "  --no-translations      Skip translation synchronization step"
    echo "  --deploy-only          Only run the deployment step (ssh)"
    echo "                         Useful for retrying a failed deployment"
    echo "  --same-as=ENV          Use same version as specified environment"
    echo "                         ENV can be 'testnet' or 'mainnet'"
    echo "                         Cannot be used with explicit version number"
    echo "  --dry-run             Show what would be done without making any changes"
    echo "                         Useful for testing deployment configuration"
    echo
    echo -e "${CYAN}Environment Selection (Required):${NC}"
    echo "  --mainnet             Deploy to production environment"
    echo "                         Servers: ${MAINNET_SERVERS[*]}"
    echo "  --testnet             Deploy to test environment"
    echo "                         Servers: ${TESTNET_SERVERS[*]}"
    echo
    echo -e "${CYAN}Examples:${NC}"
    echo "1. Deploy to testnet (basic):"
    echo -e "   ${GREEN}$0 3.0.10 -m '- Fix network stall handling' --deployer=matheo --testnet${NC}"
    echo
    echo "2. Deploy to mainnet with multi-line message:"
    echo -e "   ${GREEN}$0 3.0.4 -m '- Move network browsers warning"
    echo "- Add retry-mechanism to network requests"
    echo "- Hide staked amounts in privacy mode' --deployer=john --mainnet${NC}"
    echo
    echo "3. Retry a failed deployment:"
    echo -e "   ${GREEN}$0 --deploy-only --testnet${NC}"
    echo
    echo "4. Deploy testnet version to mainnet:"
    echo -e "   ${GREEN}$0 --same-as=testnet -m 'Same fixes as testnet' --deployer=john --mainnet${NC}"
    echo
    echo "5. Dry run to test deployment:"
    echo -e "   ${GREEN}$0 3.0.11 -m 'Test deployment' --deployer=jane --testnet --dry-run${NC}"
    echo
    echo -e "${CYAN}Notes:${NC}"
    echo "- Version must be greater than the last deployed version"
    echo "- Commit message (-m) supports multi-line text"
    echo "- --deploy-only skips build and just runs deployment"
    echo "- --same-as copies version from another environment"

    # Exit with status 0 if this is a help request, 1 if it's an error
    [ -z "$error_msg" ] && exit 0 || exit 1
}

# Function to compare version numbers
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Function to run command with error handling
run_command() {
    local cmd=$1
    local error_msg=${2:-"Command failed"}

    # For build command in dry run mode, set CI environment variables
    if [ "$DRY_RUN" = true ] && [[ "$cmd" == *"yarn build"* ]]; then
        cmd="CI=true CI_COMMIT_BRANCH=dry-run CI_PIPELINE_ID=0 CI_COMMIT_SHORT_SHA=dryrun $cmd"
    fi

    if [ "$DRY_RUN" = true ]; then
        # Only skip git operations in dry-run mode
        if [[ "$cmd" =~ ^git|^ssh ]]; then
            echo -e "${CYAN}[DRY RUN] $cmd${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}$ $cmd${NC}"
    fi
    if ! eval "$cmd"; then
        echo -e "${RED}Error: $error_msg${NC}"
        exit 1
    fi
}

# Function to handle confirmation prompts
confirm_prompt() {
    local prompt_message="${1:-Are you sure you want to proceed? [y/N]}"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}This is a dry run - no changes will be made. Proceeding automatically...${NC}"
        return 0
    fi

    while true; do
        echo -e "${YELLOW}${prompt_message}${NC}"
        read -n 1 -r
        echo    # Move to a new line
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 0
        elif [[ $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${RED}Operation cancelled.${NC}"
            exit 1
        fi
        # If neither Y/y nor N/n was pressed, continue the loop
        echo -e "${YELLOW}Please answer 'y' or 'n'${NC}"
    done
}

# Function to handle SSH deployment
do_ssh_deployment() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would deploy to the following servers:${NC}"
        for server in "${DEPLOY_SERVERS[@]}"; do
            echo -e "${CYAN}  - $server${NC}"
        done
        return 0
    fi

    confirm_prompt "${1:-The new version is ready. Do you want to proceed with the deployment? [y/N]}"

    # SSH into deployment servers
    echo -e "${BLUE}Connecting to deployment servers...${NC}"
    local deployment_success=true
    for server in "${DEPLOY_SERVERS[@]}"; do
        echo -e "${CYAN}Connecting to $server...${NC}"
        if ! ssh "$server"; then
            echo -e "${RED}Failed to connect to $server${NC}"
            deployment_success=false
            break
        fi
    done

    if [ "$deployment_success" = true ]; then
        echo -e "${GREEN}Deployment complete!${NC}"
        echo -e "${YELLOW}> Please verify that the deployment went through successfully.${NC}"
        echo -e "${YELLOW}> Please also verify that the website is working correctly on $BUILD_ENV and is correctly using the new version $VERSION.${NC}"
        echo -e "${YELLOW}> https://$([ "$BUILD_ENV" = "mainnet" ] && echo "${APP_NAME}.nimiq.com" || echo "${APP_NAME}.nimiq-testnet.com")${NC}"
        return 0
    else
        return 1
    fi
}

# Function to cleanup local tags on failure
cleanup_local_tags() {
    if [ "$DRY_RUN" = true ] || [ -z "$VERSION" ]; then
        return 0
    fi

    echo -e "${YELLOW}Cleaning up local tags...${NC}"

    # Clean up source repo tag if it exists and we're not using --same-as
    if [ -z "$SAME_AS" ]; then
        if git tag | grep -q "^v$VERSION$"; then
            echo -e "${CYAN}Removing source tag v$VERSION...${NC}"
            run_command "cd .. && git tag -d \"v$VERSION\" && cd -" "Failed to remove source tag"
        fi
    fi

    # Clean up deployment repo tag if it exists
    if git tag | grep -q "^v$VERSION-$ENV_TAG-$DEPLOYER$"; then
        echo -e "${CYAN}Removing deployment tag v$VERSION-$ENV_TAG-$DEPLOYER...${NC}"
        run_command "git tag -d \"v$VERSION-$ENV_TAG-$DEPLOYER\"" "Failed to remove deployment tag"
    fi
}

# Set up trap for cleanup on script exit
trap 'cleanup_status=$?; if [ $cleanup_status -ne 0 ]; then cleanup_local_tags; fi; exit $cleanup_status' EXIT INT TERM

# Function to create commit/tag message
create_message() {
    local message="Nimiq ${APP_NAME_CAPITALIZED} v$VERSION

$COMMIT_MSG"

    if [ -n "$EXCLUDE_RELEASE" ]; then
        message+="

$EXCLUDE_RELEASE"
    fi

    echo "$message"
}

# Function to show deployment recap
show_deployment_recap() {
    echo
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}=== DRY RUN - Deployment Recap (No changes will be made) ===${NC}"
    else
        echo -e "${BLUE}=== Deployment Recap ===${NC}"
    fi
    echo -e "${CYAN}Version:${NC} $VERSION"
    echo -e "${CYAN}Environment:${NC} $BUILD_ENV"
    echo -e "${CYAN}Deployer:${NC} $DEPLOYER"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}Mode:${NC} ${YELLOW}DRY RUN (No GIT or SSH operations will be performed)${NC}"
    fi
    echo -e "${CYAN}Target Servers:${NC}"
    for server in "${DEPLOY_SERVERS[@]}"; do
        echo -e "  - $server"
    done
    echo -e "${CYAN}Exclude Release:${NC} $([ -n "$EXCLUDE_RELEASE" ] && echo "Yes" || echo "No")"
    echo -e "${CYAN}Sync Translations:${NC} $SYNC_TRANSLATIONS"
    echo -e "${CYAN}Commit Message:${NC}"
    echo "$COMMIT_MSG" | sed 's/^/  /'
    echo

    confirm_prompt "Please review the deployment details above. Do you want to proceed? [y/N]"
}

#########################
### MAIN EXECUTION ######
#########################

# Check for help flag first
if [ $# -eq 0 ] || [ "${1:-}" == "--help" ] || [ "${1:-}" == "-h" ]; then
    show_usage
fi

# Initialize variables for argument parsing
ARGS=("$@")
ARGS_LENGTH=${#ARGS[@]}
VERSION=""
i=0

# First pass: look for --same-as and --deploy-only flags
while [ $i -lt $ARGS_LENGTH ]; do
    arg="${ARGS[$i]}"
    if [[ "$arg" =~ ^--same-as= ]]; then
        SAME_AS="${arg#*=}"
        if [[ ! "$SAME_AS" =~ ^(testnet|mainnet)$ ]]; then
            echo -e "${RED}Error: --same-as must be either 'testnet' or 'mainnet'${NC}"
            exit 1
        fi
        unset 'ARGS[$i]'
    elif [[ "$arg" == "--deploy-only" ]]; then
        DEPLOY_ONLY=true
        unset 'ARGS[$i]'
    fi
    ((i++)) || true
done

# Reconstruct args array without the processed flags
ARGS=("${ARGS[@]}")

# If neither --same-as nor --deploy-only is used, look for version number
if [ -z "$SAME_AS" ] && [ "$DEPLOY_ONLY" = false ]; then
    VERSION_FOUND=false
    for arg in "${ARGS[@]}"; do
        if [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            VERSION="$arg"
            VERSION_PROVIDED_BY_USER=true
            VERSION_FOUND=true
            break
        fi
    done

    if [ "$VERSION_FOUND" = false ]; then
        show_usage "Version number is required when not using --same-as or --deploy-only"
    fi
fi

# Parse remaining arguments
for arg in "${ARGS[@]}"; do
    case $arg in
        [0-9]*.[0-9]*.[0-9]*)
            # Skip version number as it's already processed
            continue
            ;;
        --deployer=*)
            DEPLOYER="${arg#*=}"
            ;;
        --exclude-release)
            EXCLUDE_RELEASE="[exclude-release]"
            ;;
        --no-translations)
            SYNC_TRANSLATIONS=false
            ;;
        --mainnet)
            BUILD_ENV="mainnet"
            DEPLOY_SERVERS=("${MAINNET_SERVERS[@]}")
            ;;
        --testnet)
            BUILD_ENV="testnet"
            DEPLOY_SERVERS=("${TESTNET_SERVERS[@]}")
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        -m)
            # Get the next argument as the commit message
            shift_count=0
            for ((j=0; j<${#ARGS[@]}; j++)); do
                if [ "${ARGS[$j]}" = "$arg" ] && [ $((j+1)) -lt ${#ARGS[@]} ]; then
                    COMMIT_MSG="${ARGS[$((j+1))]}"
                    break
                fi
            done
            if [ -z "$COMMIT_MSG" ]; then
                echo -e "${RED}Error: -m requires a commit message${NC}"
                exit 1
            fi
            ;;
        *)
            # Skip if it's the commit message (follows -m)
            if [ "$prev_arg" != "-m" ]; then
                # Ignore empty args (from unset array elements)
                if [ -n "$arg" ]; then
                    echo -e "${RED}Error: Unknown parameter $arg${NC}"
                    exit 1
                fi
            fi
            ;;
    esac
    prev_arg="$arg"
done

# Parameter validation
if [ "$DEPLOY_ONLY" = false ]; then
    if [ -z "$DEPLOYER" ]; then
        show_usage "--deployer parameter is required"
    fi
    if [ -z "$COMMIT_MSG" ]; then
        show_usage "commit message (-m) is required"
    fi
fi

# Always require environment specification
if [ -z "$BUILD_ENV" ]; then
    show_usage "Either --mainnet or --testnet must be specified"
fi

# After parsing arguments and before validation, handle --same-as
if [ -n "$SAME_AS" ]; then
    echo -e "${BLUE}Looking up version from $SAME_AS deployment...${NC}"

    # Determine the environment tag to look for
    LOOKUP_TAG=$([ "$SAME_AS" = "mainnet" ] && echo "main" || echo "test")

    # Get the latest version from the specified environment
    cd "$DEPLOYMENT_REPO" || exit 1
    LATEST_VERSION=$(git tag | grep "^v[0-9].*-$LOOKUP_TAG-" | sort -V | tail -n 1 | sed 's/^v\([0-9][^-]*\).*/\1/')
    cd - > /dev/null || exit 1

    if [ -z "$LATEST_VERSION" ]; then
        echo -e "${RED}Error: No version found in $SAME_AS environment${NC}"
        exit 1
    fi

    echo -e "${GREEN}Found version $LATEST_VERSION${NC}"
    VERSION="$LATEST_VERSION"
fi

# Version validation
if [ "$DEPLOY_ONLY" = false ] && [ -z "$SAME_AS" ]; then
    if [ -z "$VERSION" ]; then
        show_usage "Version number is required when not using --deploy-only or --same-as"
    elif ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        show_usage "Version number must be in format X.Y.Z"
    fi
elif [ "$VERSION_PROVIDED_BY_USER" = true ]; then
    show_usage "Version number cannot be provided when using --deploy-only or --same-as"
fi

# Set environment tag based on BUILD_ENV
ENV_TAG=$([ "$BUILD_ENV" = "mainnet" ] && echo "main" || echo "test")

# If deploy-only flag is set, skip to deployment
if [ "$DEPLOY_ONLY" = true ]; then
    echo -e "${BLUE}Running deployment only...${NC}"
    do_ssh_deployment "Are you sure you want to proceed with the deployment? [y/N] "
    exit 0
fi

# Add recap before starting deployment process
show_deployment_recap

# Pre-deployment tasks
echo -e "${BLUE}Running pre-deployment tasks...${NC}"

if [ "$SYNC_TRANSLATIONS" = "true" ]; then
    echo -e "${CYAN}Syncing translations...${NC}"
    run_command "yarn i18n:sync" "Failed to sync translations"
fi

# Get up-to-date EBA RT1 bank list (disabled while OASIS is not available)
# yarn utils:getBankList

# Get up-to-date browsers support list from caniuse.
# The browserslist utility is meant to run via npx, even when usually using yarn, and is compatible with yarn.lock.
echo -e "${CYAN}Updating browsers support list...${NC}"
run_command "npx update-browserslist-db@latest" "Failed to update browsers list"

# Build Nginx path allowlist
echo -e "${CYAN}Building Nginx path allowlist...${NC}"
run_command "yarn utils:makeNginxAllowlist" "Failed to build Nginx allowlist"

# Check for uncommitted changes
if [[ `git status --porcelain` ]]; then
    echo -e "${RED}ERROR: The repository has uncommitted changes. Commit them first, then run again.${NC}"
    exit 1
fi

# Check for new version against existing tags
if [ -z "$SAME_AS" ]; then
    echo -e "${BLUE}Checking version against existing tags in ${APP_NAME} repo...${NC}"
    EXISTING_TAGS=$(git tag | grep "^v[0-9]" | sed 's/^v//')
    LATEST_TAG=$(echo "$EXISTING_TAGS" | sort -V | tail -n 1)
    for tag in $EXISTING_TAGS; do
        if ! version_gt "$VERSION" "$tag"; then
            echo -e "${RED}Error: Version $VERSION is not greater than latest version $LATEST_TAG${NC}"
            exit 1
        fi
    done
else
    echo -e "${BLUE}Skipping version comparison check since --same-as is used${NC}"
fi

# Create source tag (skip if using --same-as)
if [ -z "$SAME_AS" ]; then
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would create source tag v$VERSION with message:${NC}"
        create_message
    else
        echo -e "${BLUE}Creating source tag v$VERSION...${NC}"
        run_command "git tag -a -s \"v$VERSION\" -m \"$(create_message)\"" "Failed to create git tag"
    fi
else
    echo -e "${BLUE}Skipping source tag creation since --same-as is used${NC}"
fi

# Build the project
echo -e "${BLUE}Building project with $BUILD_ENV configuration...${NC}"
run_command "env \"build=$BUILD_ENV\" yarn build" "Failed to build project"

# Deploy to deployment repository
echo -e "${BLUE}Deploying to $DEPLOYMENT_REPO...${NC}"
run_command "cd \"$DEPLOYMENT_REPO\" || exit 1" "Failed to change to deployment directory"

# Checkout appropriate branch and pull latest changes
DEPLOY_BRANCH=$([ "$BUILD_ENV" = "mainnet" ] && echo "mainnet" || echo "testnet")
echo -e "${CYAN}Checking out $DEPLOY_BRANCH branch...${NC}"
run_command "git checkout $DEPLOY_BRANCH" "Failed to checkout branch"
run_command "git pull" "Failed to pull latest changes"

# Check version against deployment repo tags
echo -e "${BLUE}Checking version against existing tags in deployment repo ($DEPLOY_BRANCH branch)...${NC}"
EXISTING_DEPLOY_TAGS=$(git tag | grep "^v[0-9].*-$ENV_TAG-" | sed 's/^v\([0-9][^-]*\).*/\1/')
for tag in $EXISTING_DEPLOY_TAGS; do
    if ! version_gt "$VERSION" "$tag"; then
        echo -e "${RED}Error: Version $VERSION is not greater than existing version $tag in deployment repo.\nDid you already deploy this version? 🧐${NC}"
        exit 1
    fi
done

# Clean deployment directory
echo -e "${CYAN}Cleaning deployment directory...${NC}"
run_command "./clean.sh" "Failed to clean deployment directory"

# Copy build files
echo -e "${CYAN}Copying build files...${NC}"
run_command "cp -r ../dist/. dist" "Failed to copy build files"
run_command "git add dist" "Failed to stage changes"

# Show git status and ask for confirmation
echo -e "${YELLOW}Current git status:${NC}"
git status

confirm_prompt "Please review the changes above. Do you want to proceed with the commit? [y/N]"

# Commit changes
echo -e "${CYAN}Committing changes...${NC}"
run_command "git commit -m \"$(create_message)\"" "Failed to commit changes"

# Create deployment tag
echo -e "${BLUE}Creating deployment tag...${NC}"
run_command "git tag -a -s \"v$VERSION-$ENV_TAG-$DEPLOYER\" -m \"$(create_message)\"" "Failed to create deployment tag"

# Push all changes and tags to both repositories right before deployment
if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}Pushing all changes and tags to remote repositories...${NC}"
    if [ -z "$SAME_AS" ]; then
        echo -e "${CYAN}Pushing source repository changes and tags...${NC}"
        run_command "cd .. && git push && git push --tags && cd -" "Failed to push source changes and tags"
    fi
    echo -e "${CYAN}Pushing deployment repository changes and tags...${NC}"
    run_command "git push && git push --tags" "Failed to push deployment changes and tags"
fi

# Run the deployment
if ! do_ssh_deployment; then
    echo -e "${RED}Deployment failed. Local tags will be cleaned up.${NC}"
    exit 1
fi
