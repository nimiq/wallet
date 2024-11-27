#!/bin/bash

# Exit on error
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# App name
APP_NAME="wallet"
APP_NAME_CAPITALIZED="Wallet"

# Function to display usage message
show_usage() {
    local error_msg="$1"

    if [ -n "$error_msg" ]; then
        echo -e "${RED}Error: $error_msg${NC}"
        echo
    fi

    echo -e "${BLUE}Usage: $0 <version_number> -m <commit_message> --deployer=NAME [--exclude-release] [--no-translations] [--mainnet|--testnet] [--deploy-only] [--same-as=ENV]${NC}"
    echo
    echo -e "${CYAN}Examples:${NC}"
    echo "1. Simple message (testnet):"
    echo -e "   ${GREEN}$0 3.0.10 -m 'Fix network stall handling' --deployer=matheo --testnet${NC}"
    echo
    echo "2. Multi-line message (mainnet):"
    echo -e "   ${GREEN}$0 3.0.4 -m '- Move network browsers-not-shown warning to not overlap with bottom row"
    echo "- Add a \"Failed to fetch transactions\" notice when transaction fetching fails"
    echo "- Add a retry-mechanism to all Nimiq network requests"
    echo "- Also hide staked amounts when privacy mode is on"
    echo -e "- Enforce minimum stake on the slider itself' --deployer=john --mainnet${NC}"
    echo
    echo "3. Deploy only (after a cancelled deployment):"
    echo -e "   ${GREEN}$0 --deploy-only${NC}"
    echo "4. Deploy same version from testnet to mainnet:"
    echo -e "   ${GREEN}$0 --same-as=testnet -m 'Same fixes as testnet' --deployer=john --mainnet${NC}"
    exit 1
}

# Check if first argument is a flag
if [[ "$1" =~ ^-- ]]; then
    if [[ "$1" =~ ^--same-as= ]] || [[ "$1" == "--deploy-only" ]]; then
        # These flags are allowed as first argument
        :
    else
        show_usage "Version number must be the first argument when not using --same-as or --deploy-only"
    fi
fi

# Default values
DEPLOYER=""
EXCLUDE_RELEASE=""
SYNC_TRANSLATIONS=true
BUILD_ENV=""
DEPLOY_ONLY=false
SAME_AS=""

# Define deploy servers for different environments
MAINNET_SERVERS=("deploy_${APP_NAME}@web-1" "deploy_${APP_NAME}@web-2" "deploy_${APP_NAME}@web-3" "deploy_${APP_NAME}@web-4")
TESTNET_SERVERS=("deploy_${APP_NAME}@testnet-web1")
DEPLOY_SERVERS=()

DEPLOYMENT_REPO="deployment-${APP_NAME}"

# Initial argument handling
if [[ "$1" =~ ^--same-as= ]]; then
    SAME_AS="${1#*=}"
    if [[ ! "$SAME_AS" =~ ^(testnet|mainnet)$ ]]; then
        echo -e "${RED}Error: --same-as must be either 'testnet' or 'mainnet'${NC}"
        exit 1
    fi
    VERSION=""
    shift
elif [[ "$1" == "--deploy-only" ]]; then
    VERSION=""
    DEPLOY_ONLY=true
    shift
elif [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    VERSION="$1"
    VERSION_PROVIDED_BY_USER=true
    shift
elif [[ "$1" =~ ^- ]]; then
    show_usage "Version number must be the first argument when not using --same-as or --deploy-only"
else
    show_usage "First argument must be either a version number, --same-as=ENV, or --deploy-only"
fi

# Parse remaining arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --deployer=*)
            DEPLOYER="${1#*=}"
            shift
            ;;
        --exclude-release)
            EXCLUDE_RELEASE="[exclude-release]"
            shift
            ;;
        --no-translations)
            SYNC_TRANSLATIONS=false
            shift
            ;;
        --mainnet)
            BUILD_ENV="mainnet"
            DEPLOY_SERVERS=("${MAINNET_SERVERS[@]}")
            shift
            ;;
        --testnet)
            BUILD_ENV="testnet"
            DEPLOY_SERVERS=("${TESTNET_SERVERS[@]}")
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        --same-as=*)
            SAME_AS="${1#*=}"
            if [[ ! "$SAME_AS" =~ ^(testnet|mainnet)$ ]]; then
                echo -e "${RED}Error: --same-as must be either 'testnet' or 'mainnet'${NC}"
                exit 1
            fi
            shift
            ;;
        -m)
            shift
            if [ $# -eq 0 ]; then
                echo -e "${RED}Error: -m requires a commit message${NC}"
                exit 1
            fi
            COMMIT_MSG="$1"
            shift
            ;;
        *)
            echo -e "${RED}Error: Unknown parameter $1${NC}"
            exit 1
            ;;
    esac
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

# Function to compare version numbers
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Function to run command with error handling
run_command() {
    local cmd=$1
    local error_msg=${2:-"Command failed"}

    echo -e "${YELLOW}$ $cmd${NC}"
    if ! eval "$cmd"; then
        echo -e "${RED}Error: $error_msg${NC}"
        exit 1
    fi
}

# Function to handle SSH deployment
do_ssh_deployment() {
    # Confirmation prompt before deployment
    echo -e "${YELLOW}${1:-The new version is ready. Do you want to proceed with the deployment? [y/N] }${NC}"
    read -n 1 -r
    echo    # Move to a new line
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo -e "${RED}Deployment cancelled.${NC}"
        exit 1
    fi

    # SSH into deployment servers
    echo -e "${BLUE}Connecting to deployment servers...${NC}"
    for server in "${DEPLOY_SERVERS[@]}"; do
        echo -e "${CYAN}Connecting to $server...${NC}"
        if ! ssh "$server"; then
            echo -e "${RED}Failed to connect to $server${NC}"
            exit 1
        fi
    done

    echo -e "${GREEN}Deployment complete!${NC}"
    echo -e "${YELLOW}> Please verify that the deployment went through successfully.${NC}"
    echo -e "${YELLOW}> Please also verify that the website is working correctly on $BUILD_ENV and is correctly using the new version $VERSION.${NC}"
    echo -e "${YELLOW}> https://$([ "$BUILD_ENV" = "mainnet" ] && echo "${APP_NAME}.nimiq.com" || echo "${APP_NAME}.nimiq-testnet.com")${NC}"
}

# If deploy-only flag is set, skip to deployment
if [ "$DEPLOY_ONLY" = true ]; then
    echo -e "${BLUE}Running deployment only...${NC}"
    do_ssh_deployment "Are you sure you want to proceed with the deployment? [y/N] "
    exit 0
fi

# Check if new version is greater than all existing tags in current repo
if [ -z "$SAME_AS" ]; then
    echo -e "${BLUE}Checking version against existing tags in ${APP_NAME} repo...${NC}"
    EXISTING_TAGS=$(git tag | grep "^v[0-9]" | sed 's/^v//')
    for tag in $EXISTING_TAGS; do
        if ! version_gt "$VERSION" "$tag"; then
            echo -e "${RED}Error: Version $VERSION is not greater than existing version $tag${NC}"
            exit 1
        fi
    done
else
    echo -e "${BLUE}Skipping version comparison check since --same-as is used${NC}"
fi

# Set environment tag based on BUILD_ENV
ENV_TAG=$([ "$BUILD_ENV" = "mainnet" ] && echo "main" || echo "test")

# Function to show deployment recap
show_deployment_recap() {
    echo
    echo -e "${BLUE}=== Deployment Recap ===${NC}"
    echo -e "${CYAN}Version:${NC} $VERSION"
    echo -e "${CYAN}Environment:${NC} $BUILD_ENV"
    echo -e "${CYAN}Deployer:${NC} $DEPLOYER"
    echo -e "${CYAN}Target Servers:${NC}"
    for server in "${DEPLOY_SERVERS[@]}"; do
        echo -e "  - $server"
    done
    echo -e "${CYAN}Exclude Release:${NC} $([ -n "$EXCLUDE_RELEASE" ] && echo "Yes" || echo "No")"
    echo -e "${CYAN}Sync Translations:${NC} $SYNC_TRANSLATIONS"
    echo -e "${CYAN}Commit Message:${NC}"
    echo "$COMMIT_MSG" | sed 's/^/  /'
    echo
    echo -e "${YELLOW}Please review the deployment details above. Do you want to proceed? [y/N]${NC}"
    read -n 1 -r
    echo    # Move to a new line
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo -e "${RED}Deployment cancelled.${NC}"
        exit 1
    fi
}

# Add recap before starting deployment process
if [ "$DEPLOY_ONLY" = false ]; then
    show_deployment_recap
fi

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
run_command "npx browserslist@latest --update-db" "Failed to update browsers list"

# Build Nginx path allowlist
echo -e "${CYAN}Building Nginx path allowlist...${NC}"
run_command "yarn utils:makeNginxAllowlist" "Failed to build Nginx allowlist"

# Check for uncommitted changes
if [[ `git status --porcelain` ]]; then
    echo -e "${RED}ERROR: The repository has uncommitted changes. Commit them first, then run again.${NC}"
    exit 1
fi

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

# Create and push source tag (skip if using --same-as)
if [ -z "$SAME_AS" ]; then
    echo -e "${BLUE}Creating source tag v$VERSION...${NC}"
    run_command "git tag -a -s \"v$VERSION\" -m \"$(create_message)\"" "Failed to create git tag"

    # Push changes and tags
    echo -e "${BLUE}Pushing source changes and tags...${NC}"
    run_command "git push && git push --tags" "Failed to push changes"
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

# Check if new version is greater than all existing tags in deployment repo for the current branch
echo -e "${BLUE}Checking version against existing tags in deployment repo ($DEPLOY_BRANCH branch)...${NC}"
EXISTING_DEPLOY_TAGS=$(git tag | grep "^v[0-9].*-$ENV_TAG-" | sed 's/^v\([0-9][^-]*\).*/\1/')
for tag in $EXISTING_DEPLOY_TAGS; do
    if ! version_gt "$VERSION" "$tag"; then
        echo -e "${RED}Error: Version $VERSION is not greater than existing version $tag in deployment repo${NC}"
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

echo -e "${YELLOW}Please review the changes above. Do you want to proceed with the commit? [y/N]${NC}"
read -n 1 -r
echo    # Move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Commit changes
echo -e "${CYAN}Committing changes...${NC}"
run_command "git commit -m \"$(create_message)\"" "Failed to commit changes"

# Create deployment tag
echo -e "${BLUE}Creating deployment tag...${NC}"
run_command "git tag -a -s \"v$VERSION-$ENV_TAG-$DEPLOYER\" -m \"$(create_message)\"" "Failed to create deployment tag"

# Push deployment changes and tags
echo -e "${BLUE}Pushing deployment changes and tags...${NC}"
run_command "git push && git push --tags" "Failed to push deployment changes"

# Run the deployment
do_ssh_deployment
