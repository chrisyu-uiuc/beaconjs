# Quick Start - Raspberry Pi Deployment

## Method 1: Automated Deployment (Easiest)

### From Your Mac:

```bash
# Deploy to Raspberry Pi
./deploy-to-pi.sh pi@raspberrypi.local
```

### On Raspberry Pi:

```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Run setup script
cd beaconjs
chmod +x pi-setup.sh
./pi-setup.sh
```

The script will:
- Install dependencies
- Configure gateway ID, name, and location
- Set up AWS credentials
- Test the scanner
- Install as a service (optional)

---

## Method 2: Manual Deployment

### Step 1: Copy Files to Raspberry Pi

```bash
# From your Mac
scp -r beaconjs pi@raspberrypi.local:/home/pi/
```

### Step 2: Install on Raspberry Pi

```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Install
cd beaconjs
npm install

# Configure
cp .env.example .env
nano .env
```

### Step 3: Edit .env

Change these values (each Pi must be unique):
```bash
GATEWAY_ID=rpi-001
GATEWAY_NAME=Main Entrance Gateway
GATEWAY_LOCATION=Building A, Room 101
```

### Step 4: AWS Credentials

```bash
mkdir -p ~/.aws
nano ~/.aws/credentials
```

Add:
```
[default]
aws_access_key_id = YOUR_KEY
aws_secret_access_key = YOUR_SECRET
```

### Step 5: Test

```bash
node quick_start.js
```

### Step 6: Install as Service

```bash
sudo nano /etc/systemd/system/beacon-scanner.service
```

Paste:
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

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable beacon-scanner
sudo systemctl start beacon-scanner
```

---

## Essential Files Needed

Only copy these files to Raspberry Pi:

```
beaconjs/
├── package.json              # Dependencies
├── quick_start.js            # Main application
├── .env.example              # Configuration template
├── config/
│   └── aws-config.js         # AWS configuration
└── services/
    └── beacon-storage.js     # DynamoDB storage
```

---

## Multiple Raspberry Pi Setup

### Pi 1:
```bash
GATEWAY_ID=rpi-001
GATEWAY_NAME=Entrance Gateway
GATEWAY_LOCATION=Main Entrance
```

### Pi 2:
```bash
GATEWAY_ID=rpi-002
GATEWAY_NAME=Warehouse Gateway
GATEWAY_LOCATION=Warehouse Zone A
```

### Pi 3:
```bash
GATEWAY_ID=rpi-003
GATEWAY_NAME=Office Gateway
GATEWAY_LOCATION=Office Floor 2
```

---

## Useful Commands

```bash
# View logs
sudo journalctl -u beacon-scanner -f

# Check status
sudo systemctl status beacon-scanner

# Restart service
sudo systemctl restart beacon-scanner

# Stop service
sudo systemctl stop beacon-scanner

# Test Bluetooth
sudo hcitool lescan
```

---

## Troubleshooting

### Permission Error
```bash
sudo node quick_start.js
```

### Check Bluetooth
```bash
hciconfig
sudo hcitool lescan
```

### View Service Logs
```bash
sudo journalctl -u beacon-scanner -n 100
```

---

## File Sizes

The essential files are very small:
- `package.json`: ~1 KB
- `quick_start.js`: ~5 KB
- `config/aws-config.js`: ~3 KB
- `services/beacon-storage.js`: ~15 KB
- `.env.example`: ~1 KB

Total: ~25 KB (before npm install)

After `npm install`, node_modules will be ~50 MB.
