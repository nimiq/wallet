#!/bin/bash

# Check if version number is provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version_number> [commit_message] [--deployer=NAME] [--exclude-release] [--no-translations] [--mainnet] [--deploy-only]"
    echo
    echo "Examples:"
    echo "1. Simple message (testnet):"
    echo "   $0 3.0.10 'Fix network stall handling' --deployer=matheo"
    echo
    echo "2. Multi-line message (mainnet):"
    echo "   $0 3.0.4 '- Move network browsers-not-shown warning to not overlap with bottom row"
    echo "- Add a \"Failed to fetch transactions\" notice when transaction fetching fails"
    echo "- Add a retry-mechanism to all Nimiq network requests"
    echo "- Also hide staked amounts when privacy mode is on"
    echo "- Enforce minimum stake on the slider itself' --deployer=john --mainnet"
    echo
    echo "3. Deploy only (after a cancelled deployment):"
    echo "   $0 --deploy-only"
    exit 1
fi

# Don't require version number if --deploy-only is specified
if [[ "$1" == "--deploy-only" ]]; then
    VERSION=""
    DEPLOY_ONLY=true
    shift
else
    VERSION="$1"
    shift # Remove version from arguments
fi

# Default values
DEPLOYER="matheo"
EXCLUDE_RELEASE=""
SYNC_TRANSLATIONS=true
BUILD_ENV="testnet"
DEPLOY_ONLY=false

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
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        *)
            COMMIT_MSG="$1"
            shift
            ;;
    esac
done

# Function to handle SSH deployment
do_ssh_deployment() {
    # Confirmation prompt before deployment
    read -p "${1:-The new version is ready. Do you want to proceed with the deployment? [y/N] }" -n 1 -r
    echo    # Move to a new line
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo "Deployment cancelled."
        exit 1
    fi

    # SSH into deployment servers
    echo "Connecting to deployment servers..."
    for server in "${DEPLOY_SERVERS[@]}"; do
        echo "Connecting to $server..."
        ssh "$server"
    done

    echo "Deployment complete!"
}

# If deploy-only flag is set, skip to deployment
if [ "$DEPLOY_ONLY" = true ]; then
    echo "Running deployment only..."
    do_ssh_deployment "Are you sure you want to proceed with the deployment? [y/N] "
    exit 0
fi

# Use default commit message if none provided
COMMIT_MSG="${COMMIT_MSG:-Update to version $VERSION}"

# Validate version number format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version number must be in format X.Y.Z"
    exit 1
fi

# Function to compare version numbers
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Check if new version is greater than all existing tags in current repo
echo "Checking version against existing tags in wallet repo..."
EXISTING_TAGS=$(git tag | grep "^v[0-9]" | sed 's/^v//')
for tag in $EXISTING_TAGS; do
    if ! version_gt "$VERSION" "$tag"; then
        echo "Error: Version $VERSION is not greater than existing version $tag"
        exit 1
    fi
done

# Configuration
DEPLOYMENT_REPO="deployment-wallet"
DEPLOY_SERVERS=("deploy_wallet@web-1" "deploy_wallet@web-2" "deploy_wallet@web-3" "deploy_wallet@web-4")

# Set environment tag based on BUILD_ENV
ENV_TAG=$([ "$BUILD_ENV" = "mainnet" ] && echo "main" || echo "test")

# Pre-deployment tasks
echo "Running pre-deployment tasks..."

if [ "$SYNC_TRANSLATIONS" = "true" ]; then
    echo "Syncing translations..."
    yarn i18n:sync
fi

# Get up-to-date EBA RT1 bank list (disabled while OASIS is not available)
# yarn utils:getBankList

# Get up-to-date browsers support list from caniuse.
# The browserslist utility is meant to run via npx, even when usually using yarn, and is compatible with yarn.lock.
echo "Updating browsers support list..."
npx browserslist@latest --update-db

# Build Nginx path allowlist
echo "Building Nginx path allowlist..."
yarn utils:makeNginxAllowlist

# Check for uncommitted changes
if [[ `git status --porcelain` ]]; then
    echo "ERROR: The repository has uncommitted changes. Commit them first, then run again."
    exit 1
fi

# Function to create commit/tag message
create_message() {
    echo "Nimiq Wallet v$VERSION

$COMMIT_MSG

$EXCLUDE_RELEASE"
}

# Create and push source tag
echo "Creating source tag v$VERSION..."
git tag -a -s "v$VERSION" -m "$(create_message)"

# Build the project
echo "Building project with $BUILD_ENV configuration..."
env "build=$BUILD_ENV" yarn build

# Push changes and tags
echo "Pushing source changes and tags..."
git push && git push --tags

# Deploy to deployment repository
echo "Deploying to $DEPLOYMENT_REPO..."
cd "$DEPLOYMENT_REPO" || exit 1

# Checkout appropriate branch and pull latest changes
DEPLOY_BRANCH=$([ "$BUILD_ENV" = "mainnet" ] && echo "mainnet" || echo "testnet")
echo "Checking out $DEPLOY_BRANCH branch..."
git checkout "$DEPLOY_BRANCH"
git pull

# Check if new version is greater than all existing tags in deployment repo for the current branch
echo "Checking version against existing tags in deployment repo ($DEPLOY_BRANCH branch)..."
EXISTING_DEPLOY_TAGS=$(git tag | grep "^v[0-9].*-$ENV_TAG-" | sed 's/^v\([0-9][^-]*\).*/\1/')
for tag in $EXISTING_DEPLOY_TAGS; do
    if ! version_gt "$VERSION" "$tag"; then
        echo "Error: Version $VERSION is not greater than existing version $tag in deployment repo"
        exit 1
    fi
done

# Copy build files
echo "Copying build files..."
cp -r ../dist/. dist
git add dist

# Commit changes
echo "Committing changes..."
git commit -m "$(create_message)"

# Create deployment tag
echo "Creating deployment tag..."
git tag -a -s "v$VERSION-$ENV_TAG-$DEPLOYER" -m "$(create_message)"

# Push deployment changes and tags
echo "Pushing deployment changes and tags..."
git push && git push --tags

# Run the deployment
do_ssh_deployment
