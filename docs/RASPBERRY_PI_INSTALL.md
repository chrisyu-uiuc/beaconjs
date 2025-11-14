# Raspberry Pi Installation Guide

## Quick Install

### 1. Copy Essential Files to Raspberry Pi

You only need these files:
```
beaconjs/
├── package.json
├── quick_start.js
├── .env.example
├── config/
│   └── aws-config.js
└── services/
    └── beacon-storage.js
```

### 2. Transfer Files

**Option A: Using SCP**
```bash
# From your Mac, copy to Raspberry Pi
scp -r beaconjs pi@raspberrypi.local:/home/pi/
```

**Option B: Using rsync**
```bash
rsync -av --exclude 'node_modules' --exclude '.git' beaconjs/ pi@raspberrypi.local:/home/pi/beaconjs/
```

**Option C: Using USB Drive**
1. Copy the `beaconjs` folder to USB drive
2. Insert USB into Raspberry Pi
3. Copy from USB to `/home/pi/beaconjs`

### 3. Install on Raspberry Pi

SSH into your Raspberry Pi:
```bash
ssh pi@raspberrypi.local
```

Then run:
```bash
cd /home/pi/beaconjs

# Install dependencies
npm install

# Copy and configure .env
cp .env.example .env
nano .env
```

### 4. Configure .env

Edit the `.env` file with your gateway-specific settings:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# DynamoDB Table
BEACON_TABLE_NAME=BeaconRecords

# Gateway Configuration - CHANGE FOR EACH RASPBERRY PI
GATEWAY_ID=rpi-001
GATEWAY_NAME=Raspberry Pi Gateway 1
GATEWAY_LOCATION=Building A, Room 101
```

**Important:** Each Raspberry Pi must have a unique `GATEWAY_ID`!

### 5. Configure AWS Credentials

```bash
# Create AWS credentials directory
mkdir -p ~/.aws

# Create credentials file
nano ~/.aws/credentials
```

Add your AWS credentials:
```
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

Save and set permissions:
```bash
chmod 600 ~/.aws/credentials
```

### 6. Test

```bash
# Test run
node quick_start.js

# If you get permission errors, try with sudo
sudo node quick_start.js
```

Press `Ctrl+C` to stop.

### 7. Install as Service

Create service file:
```bash
sudo nano /etc/systemd/system/beacon-scanner.service
```

Paste this content:
```ini
[Unit]
Description=Beacon Scanner Gateway
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/beaconjs
ExecStart=/usr/bin/node quick_start.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable beacon-scanner
sudo systemctl start beacon-scanner
sudo systemctl status beacon-scanner
```

### 8. View Logs

```bash
# Real-time logs
sudo journalctl -u beacon-scanner -f

# Recent logs
sudo journalctl -u beacon-scanner -n 50
```

## Multiple Raspberry Pi Setup

### Raspberry Pi 1
```bash
GATEWAY_ID=rpi-001
GATEWAY_NAME=Entrance Gateway
GATEWAY_LOCATION=Main Entrance
```

### Raspberry Pi 2
```bash
GATEWAY_ID=rpi-002
GATEWAY_NAME=Warehouse Gateway
GATEWAY_LOCATION=Warehouse Zone A
```

### Raspberry Pi 3
```bash
GATEWAY_ID=rpi-003
GATEWAY_NAME=Office Gateway
GATEWAY_LOCATION=Office Floor 2
```

## Troubleshooting

### Bluetooth Permission Error
```bash
# Run with sudo
sudo node quick_start.js

# Or add user to bluetooth group
sudo usermod -a -G bluetooth pi
```

### Check Bluetooth
```bash
# Check Bluetooth status
hciconfig

# Scan for BLE devices
sudo hcitool lescan
```

### Service Not Starting
```bash
# Check service status
sudo systemctl status beacon-scanner

# View detailed logs
sudo journalctl -u beacon-scanner -n 100 --no-pager
```

## Commands Reference

```bash
# Start service
sudo systemctl start beacon-scanner

# Stop service
sudo systemctl stop beacon-scanner

# Restart service
sudo systemctl restart beacon-scanner

# Check status
sudo systemctl status beacon-scanner

# View logs
sudo journalctl -u beacon-scanner -f

# Disable service
sudo systemctl disable beacon-scanner
```
