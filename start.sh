#!/bin/bash

echo "==================================================="
echo "Filelist Gift Automation - Setup Script for Mac/Linux"
echo "==================================================="
echo

# Make script executable if it's not already
chmod +x ./start.sh

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    echo "On Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "On macOS with Homebrew: brew install node"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d "v" -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d "." -f1)

if [ $NODE_MAJOR -lt 14 ]; then
    echo "Your Node.js version is too old. Please upgrade to Node.js 14 or newer."
    echo "Current version: $NODE_VERSION"
    exit 1
fi

echo "[✓] Node.js detected (version $NODE_VERSION)"
echo

# Create default config if not exists
if [ ! -f config.json ]; then
    echo "Creating default config.json..."
    echo "[]" > config.json
    echo "[✓] Created default config.json"
else
    echo "[✓] Found existing config.json"
fi

echo
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo
    echo "Error installing dependencies. Please check your internet connection."
    exit 1
fi

echo
echo "[✓] Dependencies installed successfully."
echo
echo "==================================================="
echo "Setup complete! Starting Filelist Gift Automation..."
echo "==================================================="
echo

npm start
