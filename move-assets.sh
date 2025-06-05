#!/bin/bash

# Create necessary directories
mkdir -p img fonts bitcoin

# Move files
mv public/img/* img/
mv public/fonts/* fonts/
mv public/bitcoin/* bitcoin/
mv public/favicon.ico .
mv public/robots.txt .
mv public/blocking.css .

# Remove empty public directory
rm -rf public

echo "Static assets moved successfully" 