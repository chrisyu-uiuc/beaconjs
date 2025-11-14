#!/bin/bash

# Raspberry Pi Deployment Script
# Usage: ./scripts/deploy-to-pi.sh pi@raspberrypi.local

if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy-to-pi.sh pi@raspberrypi.local"
    echo "Example: ./scripts/deploy-to-pi.sh pi@192.168.1.100"
    exit 1
fi

PI_HOST=$1
REMOTE_DIR="/home/pi/beaconjs"

# Get the project root directory (parent of scripts folder)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Deploying Beacon Scanner to Raspberry Pi ==="
echo "Target: $PI_HOST"
echo "Remote directory: $REMOTE_DIR"
echo ""

# Create remote directory
echo "Creating remote directory..."
ssh $PI_HOST "mkdir -p $REMOTE_DIR/config $REMOTE_DIR/services $REMOTE_DIR/dashboard $REMOTE_DIR/scripts"

# Copy essential files
echo "Copying files..."
scp package.json $PI_HOST:$REMOTE_DIR/
scp quick_start.js $PI_HOST:$REMOTE_DIR/
scp dashboard-server.js $PI_HOST:$REMOTE_DIR/
scp .env.example $PI_HOST:$REMOTE_DIR/
scp config/aws-config.js $PI_HOST:$REMOTE_DIR/config/
scp services/beacon-storage.js $PI_HOST:$REMOTE_DIR/services/
scp -r dashboard/* $PI_HOST:$REMOTE_DIR/dashboard/
scp scripts/pi-setup.sh $PI_HOST:$REMOTE_DIR/scripts/
scp scripts/start-dashboard.sh $PI_HOST:$REMOTE_DIR/scripts/
scp scripts/clear-records.py $PI_HOST:$REMOTE_DIR/scripts/

# Install dependencies
echo "Installing dependencies on Raspberry Pi..."
ssh $PI_HOST "cd $REMOTE_DIR && npm install"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. SSH into Raspberry Pi: ssh $PI_HOST"
echo "2. Run setup script: cd $REMOTE_DIR && ./scripts/pi-setup.sh"
echo "   OR manually configure:"
echo "   - Configure .env: cp .env.example .env && nano .env"
echo "   - Set GATEWAY_ID, GATEWAY_NAME, and GATEWAY_LOCATION"
echo "   - Configure AWS credentials: mkdir -p ~/.aws && nano ~/.aws/credentials"
echo "3. Test: node quick_start.js"
echo "4. Start dashboard: ./scripts/start-dashboard.sh"
