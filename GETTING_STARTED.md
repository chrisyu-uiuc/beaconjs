# Getting Started - Beacon Gateway System

## 🎯 What You Have

A complete multi-gateway beacon monitoring system with:
- ✅ Real-time beacon detection
- ✅ Cloud storage (AWS DynamoDB)
- ✅ Beautiful web dashboard
- ✅ Multi-gateway support
- ✅ Raspberry Pi ready

## 📁 Project Structure

```
beaconjs/
├── config/                      # Configuration
│   └── aws-config.js
├── services/                    # Core services
│   └── beacon-storage.js
├── dashboard/                   # Web dashboard
│   ├── index.html
│   ├── dashboard.js
│   └── test.html
├── scripts/                     # Deployment & utility scripts
│   ├── deploy-to-pi.sh
│   ├── pi-setup.sh
│   ├── start-dashboard.sh
│   └── clear-records.py
├── docs/                        # Documentation
│   ├── AWS_SETUP_GUIDE.md
│   ├── DASHBOARD_QUICK_START.md
│   ├── DASHBOARD_README.md
│   ├── DASHBOARD_TROUBLESHOOTING.md
│   ├── GATEWAY_SETUP_GUIDE.md
│   ├── MULTI_GATEWAY_SUMMARY.md
│   ├── PROJECT_STRUCTURE.md
│   ├── QUICK_START_PI.md
│   └── RASPBERRY_PI_INSTALL.md
├── quick_start.js               # Main beacon scanner
├── dashboard-server.js          # Dashboard API server
├── package.json                 # Dependencies
├── .env.example                 # Configuration template
├── .gitignore                   # Git exclusions
├── README.md                    # Main documentation
└── GETTING_STARTED.md          # This file
```

## 🚀 Quick Start

### 1. First Time Setup

```bash
# Install dependencies
npm install

# Copy configuration
cp .env.example .env

# Edit configuration
nano .env
```

Set these values:
```bash
GATEWAY_ID=gateway-001
GATEWAY_NAME=Main Office Gateway
GATEWAY_LOCATION=Building A, Main Entrance
```

### 2. Start Beacon Scanner

```bash
node quick_start.js
```

### 3. Start Dashboard

```bash
./scripts/start-dashboard.sh
```

Open: http://localhost:3000

## 📱 Deploy to Raspberry Pi

### From Your Mac:

```bash
./scripts/deploy-to-pi.sh pi@raspberrypi.local
```

### On Raspberry Pi:

```bash
ssh pi@raspberrypi.local
cd beaconjs
./scripts/pi-setup.sh
```

The script will:
- Install dependencies
- Configure gateway ID and location
- Set up AWS credentials
- Test the scanner
- Install as a service

## 📊 Dashboard Features

- **Real-time updates** every 5 seconds
- **Gateway info** - Name, location, status
- **Statistics Cards:**
  - **Beacons Detected** - Unique beacons in last 5 minutes
  - **Active Now** - Beacons detected in last 30 seconds
  - **Strongest Signal** - Best RSSI value
  - **Records Since Start** - Total detections since server started (with uptime)
- **Beacon cards** - Each beacon shows:
  - Name, UUID, Major/Minor
  - Signal strength (RSSI)
  - Estimated distance
  - Color-coded indicators (Green/Orange/Red)
  - Time since last seen

## 🔧 Common Commands

```bash
# Start beacon scanner
node quick_start.js

# Start dashboard
./scripts/start-dashboard.sh

# Deploy to Raspberry Pi
./scripts/deploy-to-pi.sh pi@192.168.1.100

# Clear all records
python3 scripts/clear-records.py

# Check DynamoDB records
aws dynamodb scan --table-name BeaconRecords --select COUNT --region us-east-1
```

## �  Understanding Dashboard Metrics

### Beacons Detected
Number of unique beacons (by UUID-Major-Minor) detected in the last 5 minutes.

### Active Now
Beacons that were detected in the last 30 seconds (real-time activity).

### Strongest Signal
Best RSSI value among all detected beacons (higher = closer).

### Records Since Start
Total number of beacon detections since the dashboard server started. This counter:
- Starts at 0 when server starts
- Increments with each detection
- Shows server uptime
- Resets when server restarts

**Example:** "Records Since Start: 150, Uptime: 5m" means 150 detections in 5 minutes (30 detections/minute).

For more details, see `docs/DASHBOARD_METRICS_EXPLAINED.md`

## 📚 Documentation Guide

### Setup & Installation
1. **docs/GATEWAY_SETUP_GUIDE.md** - Complete multi-gateway setup
2. **docs/RASPBERRY_PI_INSTALL.md** - Raspberry Pi installation
3. **docs/QUICK_START_PI.md** - Quick reference for Pi
4. **docs/AWS_SETUP_GUIDE.md** - AWS DynamoDB setup

### Dashboard
1. **docs/DASHBOARD_QUICK_START.md** - Get dashboard running
2. **docs/DASHBOARD_README.md** - Full dashboard documentation
3. **docs/DASHBOARD_TROUBLESHOOTING.md** - Fix common issues
4. **docs/DASHBOARD_METRICS_EXPLAINED.md** - Understanding metrics
5. **docs/DASHBOARD_CHANGES.md** - Recent updates
6. **docs/API_CALL_FREQUENCY.md** - API call details

### Reference
1. **README.md** - Main project overview
2. **docs/MULTI_GATEWAY_SUMMARY.md** - Multi-gateway implementation
3. **docs/PROJECT_STRUCTURE.md** - File organization

## 🎯 Deployment Scenarios

### Single Gateway (Testing)
1. Configure `.env` with gateway info
2. Run `node quick_start.js`
3. Run `node dashboard-server.js`
4. Open http://localhost:3000

### Multiple Gateways (Production)
1. Deploy to each Raspberry Pi using `deploy-to-pi.sh`
2. Configure unique `GATEWAY_ID` on each Pi
3. Install as systemd services
4. Access dashboard from any gateway

### Cloud Dashboard (Advanced)
1. Deploy dashboard to cloud server (EC2, etc.)
2. Configure to query all gateways
3. Access from anywhere

## 🔐 Security Notes

⚠️ **Important:**
- Never commit `.env` file to git (contains AWS credentials)
- Use firewall to restrict dashboard access
- Consider VPN for remote access
- Rotate AWS credentials regularly

## 📊 What's Stored in DynamoDB

Each beacon detection stores:
```json
{
  "recordId": "uuid",
  "timestamp": 1763104429699,
  "gatewayId": "gateway-001",
  "gatewayName": "Main Office Gateway",
  "gatewayLocation": "Building A",
  "beaconKey": "uuid-major-minor",
  "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
  "major": 10001,
  "minor": 19641,
  "rssi": -65,
  "txPower": -59,
  "distance": 2.5,
  "proximity": "near"
}
```

## 🎨 Dashboard Preview

```
┌─────────────────────────────────────────┐
│  🎯 Beacon Gateway Dashboard            │
│  Gateway: Main Office Gateway           │
│  Location: Building A, Main Entrance    │
│  Status: ● Active                       │
├─────────────────────────────────────────┤
│  Beacons: 5  │  Active: 3  │  RSSI: -65│
├─────────────────────────────────────────┤
│  📡 Nearby Beacons                      │
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │ MBeacon         │ │ R24080377       ││
│  │ UUID: FDA50...  │ │ UUID: FDA50...  ││
│  │ RSSI: -65 dBm   │ │ RSSI: -72 dBm   ││
│  │ Distance: 2.5m  │ │ Distance: 4.1m  ││
│  │ ████████░░ 80%  │ │ ██████░░░░ 60%  ││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

## 🆘 Need Help?

### Dashboard Not Working?
→ See `docs/DASHBOARD_TROUBLESHOOTING.md`

### Counter Not Increasing?
If "Records Since Start" stays at 0:
1. Check beacon scanner is running: `ps aux | grep quick_start`
2. Verify beacons are nearby and powered on
3. Check scanner logs: `sudo journalctl -u beacon-scanner -n 20`

### Raspberry Pi Issues?
→ See `docs/RASPBERRY_PI_INSTALL.md`

### AWS Setup Problems?
→ See `docs/AWS_SETUP_GUIDE.md`

### General Questions?
→ See `README.md`

## ✅ System Status Check

```bash
# Check if beacon scanner is running
ps aux | grep quick_start

# Check if dashboard is running
ps aux | grep dashboard-server

# Check DynamoDB records
aws dynamodb scan --table-name BeaconRecords --select COUNT --region us-east-1

# Test dashboard API
curl http://localhost:3000/api/beacons

# View logs (if running as service)
sudo journalctl -u beacon-scanner -n 20
sudo journalctl -u beacon-dashboard -n 20
```

## 🎉 You're Ready!

Your beacon monitoring system is complete and ready to deploy. Start with a single gateway to test, then expand to multiple gateways as needed.

**Next Steps:**
1. ✅ Test locally on your Mac
2. ✅ Deploy to first Raspberry Pi
3. ✅ Verify dashboard shows data
4. ✅ Deploy to additional Raspberry Pis
5. ✅ Monitor all gateways from dashboard

Happy beacon monitoring! 🎯📡
