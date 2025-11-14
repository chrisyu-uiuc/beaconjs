#!/bin/bash

# Raspberry Pi Setup Script
# Run this on the Raspberry Pi after copying files

echo "=== Beacon Scanner Setup for Raspberry Pi ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the beaconjs directory."
    exit 1
fi

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Prompt for gateway configuration
echo ""
echo "=== Gateway Configuration ==="
read -p "Enter Gateway ID (e.g., rpi-001): " GATEWAY_ID
read -p "Enter Gateway Name (e.g., Main Entrance Gateway): " GATEWAY_NAME
read -p "Enter Gateway Location (e.g., Building A, Room 101): " GATEWAY_LOCATION

# Update .env file
sed -i "s/^GATEWAY_ID=.*/GATEWAY_ID=$GATEWAY_ID/" .env
sed -i "s/^GATEWAY_NAME=.*/GATEWAY_NAME=$GATEWAY_NAME/" .env
sed -i "s/^GATEWAY_LOCATION=.*/GATEWAY_LOCATION=$GATEWAY_LOCATION/" .env

echo "✓ Gateway configuration updated in .env"

# Check AWS credentials
echo ""
echo "=== AWS Credentials ==="
if [ -f "$HOME/.aws/credentials" ]; then
    echo "✓ AWS credentials file found at ~/.aws/credentials"
else
    echo "⚠ AWS credentials not found"
    read -p "Do you want to create AWS credentials now? (y/n): " CREATE_CREDS
    if [ "$CREATE_CREDS" = "y" ]; then
        mkdir -p ~/.aws
        read -p "Enter AWS Access Key ID: " AWS_KEY
        read -p "Enter AWS Secret Access Key: " AWS_SECRET
        
        cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = $AWS_KEY
aws_secret_access_key = $AWS_SECRET
EOF
        chmod 600 ~/.aws/credentials
        echo "✓ AWS credentials created"
    fi
fi

# Test run
echo ""
echo "=== Testing Configuration ==="
read -p "Do you want to test the scanner now? (y/n): " TEST_NOW
if [ "$TEST_NOW" = "y" ]; then
    echo "Starting beacon scanner (press Ctrl+C to stop)..."
    echo ""
    node quick_start.js
fi

# Offer to install as service
echo ""
echo "=== Install as Service ==="
read -p "Do you want to install as a systemd service? (y/n): " INSTALL_SERVICE
if [ "$INSTALL_SERVICE" = "y" ]; then
    CURRENT_DIR=$(pwd)
    
    sudo tee /etc/systemd/system/beacon-scanner.service > /dev/null << EOF
[Unit]
Description=Beacon Scanner Gateway
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node quick_start.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable beacon-scanner
    sudo systemctl start beacon-scanner
    
    echo "✓ Service installed and started"
    echo ""
    echo "Service commands:"
    echo "  Status:  sudo systemctl status beacon-scanner"
    echo "  Logs:    sudo journalctl -u beacon-scanner -f"
    echo "  Stop:    sudo systemctl stop beacon-scanner"
    echo "  Restart: sudo systemctl restart beacon-scanner"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Gateway ID: $GATEWAY_ID"
echo "Gateway Name: $GATEWAY_NAME"
echo "Gateway Location: $GATEWAY_LOCATION"
echo ""
echo "To manually start: node quick_start.js"
echo "To view logs: sudo journalctl -u beacon-scanner -f"
