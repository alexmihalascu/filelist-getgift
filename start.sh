#!/usr/bin/env bash
set -euo pipefail

# Always run from the directory this script lives in.
cd "$(dirname "$0")"

echo "==================================================="
echo "Filelist Gift Automation - Setup (macOS / Linux)"
echo "==================================================="
echo

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  macOS (Homebrew): brew install node"
    exit 1
fi

# Require Node 18+ (Electron 42 needs a modern Node).
NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Your Node.js version is too old ($NODE_VERSION). Please upgrade to Node.js 18 or newer."
    exit 1
fi
echo "[OK] Node.js detected (version $NODE_VERSION)"
echo

# Create config.json from the example template if missing.
if [ ! -f config.json ]; then
    echo "Creating config.json from config.example.json..."
    cp config.example.json config.json
    echo "[OK] Created config.json - edit it with your Filelist credentials"
else
    echo "[OK] Found existing config.json"
fi

echo
echo "Installing dependencies (this also downloads Chromium for Puppeteer)..."
if ! npm install; then
    echo
    echo "Error installing dependencies. Please check your internet connection."
    exit 1
fi

echo
echo "[OK] Dependencies installed."
echo
echo "==================================================="
echo "Setup complete! Starting the app..."
echo "==================================================="
echo

npm start
