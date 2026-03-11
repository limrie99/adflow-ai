#!/bin/sh
set -e
echo "=== Starting Next.js build ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working dir: $(pwd)"
echo "Files: $(ls -la)"
echo "=== Running build ==="
npx next build 2>&1
echo "=== Build complete ==="
