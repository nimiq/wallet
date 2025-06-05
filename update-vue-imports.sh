#!/bin/bash

# Find all Vue files and update @vue/composition-api imports to vue
find src -type f -name "*.vue" -exec sed -i '' 's/@vue\/composition-api/vue/g' {} +

# Find all TypeScript files and update @vue/composition-api imports to vue
find src -type f -name "*.ts" -exec sed -i '' 's/@vue\/composition-api/vue/g' {} +

echo "Updated Vue imports in all files" 