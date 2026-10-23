#!/usr/bin/env bash
# Exit on error
set -o errexit

echo ">>> Building Frontend Assets..."
cd frontend
npm install
npm run build
cd ..

echo ">>> Installing Backend Dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo ">>> Build completed successfully!"
