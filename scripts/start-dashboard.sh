#!/bin/bash

# Start Dashboard Server Script

echo "=== Starting Beacon Dashboard ==="
echo ""

# Get the project root directory (parent of scripts folder)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    echo "Please create .env file with gateway configuration"
    exit 1
fi

# Start the dashboard server
echo "Starting dashboard server on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

node dashboard-server.js
