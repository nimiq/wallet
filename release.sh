#!/bin/bash

# Make sure a tag name was provided
tag=$1

if [ -z "$tag" ]; then
    echo "ERROR: Must provide a tag name."
    exit 1
fi

# Sync language file
yarn i18n:sync

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
