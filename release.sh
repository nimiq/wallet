#!/bin/bash

# Make sure a tag name was provided
tag=$1

if [ -z "$tag" ]; then
    echo "ERROR: Must provide a tag name."
    exit 1
fi

# Sync language file
yarn i18n:sync

# Get up-to-date EBA RT1 bank list (disabled while OASIS is not available)
# yarn utils:getBankList

# Get up-to-date browsers support list from caniuse.
# The browserslist utility is meant to run via npx, even when usually using yarn, and is compatible with yarn.lock.
npx browserslist@latest --update-db

# Build Nginx path allowlist
yarn utils:makeNginxAllowlist

if [[ `git status --porcelain` ]]; then
    echo "ERROR: The repository has changes. Commit them first, then run again."
    exit 1
fi

# Tag current commit
git tag $1 &&

# Build Vue app
yarn build &&

# Push commit and tag to origin
git push && git push --tags &&

# Done
echo "FINISHED - The app was built into the ./dist folder"
