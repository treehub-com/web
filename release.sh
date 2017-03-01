#!/usr/bin/env bash

# Make sure the dist directory exists and is empty
rm -rf ./dist
mkdir ./dist

# Populate the dist directory
cp ./src/* ./dist/.

# Replace the cache name in sw.js
sed -i '' "s/__cache__/`git rev-parse HEAD`/" ./dist/sw.js

# Upload to gcloud
gsutil -h "Cache-Control:no-cache" -m cp ./dist/* gs://app.treehub.com
