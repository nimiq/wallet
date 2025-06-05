#!/bin/bash

# Update environment variable usage in TypeScript files
find src -type f -name "*.ts" -exec sed -i '' \
    -e 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' \
    -e 's/process\.env\.BASE_URL/import.meta.env.BASE_URL/g' \
    -e 's/process\.env\.VUE_APP_/import.meta.env.VITE_/g' \
    -e 's/process\.env\.SENTRY_RELEASE/import.meta.env.VITE_SENTRY_RELEASE/g' \
    -e 's/process\.env\.VERSION/import.meta.env.VITE_VERSION/g' {} +

# Update environment variable usage in Vue files
find src -type f -name "*.vue" -exec sed -i '' \
    -e 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' \
    -e 's/process\.env\.BASE_URL/import.meta.env.BASE_URL/g' \
    -e 's/process\.env\.VUE_APP_/import.meta.env.VITE_/g' \
    -e 's/process\.env\.SENTRY_RELEASE/import.meta.env.VITE_SENTRY_RELEASE/g' \
    -e 's/process\.env\.VERSION/import.meta.env.VITE_VERSION/g' {} +

echo "Updated environment variable usage to Vite format" 