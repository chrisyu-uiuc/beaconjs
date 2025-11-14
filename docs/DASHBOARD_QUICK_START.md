# Dashboard Quick Start Guide

## ✅ Dashboard is Ready!

Your real-time beacon dashboard is now set up and ready to use.

## 🚀 Start the Dashboard

### Method 1: Using the Script (Easiest)
```bash
./start-dashboard.sh
```

### Method 2: Manual Start
```bash
node dashboard-server.js
```

## 🌐 Access the Dashboard

### On the Same Machine
Open your browser and go to:
```
http://localhost:3000
```

### From Another Device (Phone, Tablet, Computer)
1. Find your Raspberry Pi's IP address:
   ```bash
   hostname -I
   ```

2. Open browser on any device and go to:
   ```
   http://[YOUR-PI-IP]:3000
   ```
   
   Example: `http://192.168.1.100:3000`

## 📊 What You'll See

### Dashboard Features:
- **Gateway Info** - Your gateway name, location, and status
- **Statistics** - Total beacons, active beacons, strongest signal
- **Beacon Cards** - Each nearby beacon with:
  - Beacon name
  - UUID, Major, Minor
  - Signal strength (RSSI)
  - Estimated distance
  - Color-coded signal indicator
  - Time since last seen

### Auto-Refresh
- Dashboard updates every 5 seconds automatically
- Shows beacons detected in the last 5 minutes
- "Active Now" shows beacons seen in last 30 seconds

## 🎨 Signal Strength Colors

- 🟢 **Green (Strong)**: Very close (< 1 meter)
- 🟡 **Orange (Medium)**: Nearby (1-5 meters)
- 🔴 **Red (Weak)**: Far (> 5 meters)

## 🔄 Running Both Services

You need both services running:

### Terminal 1: Beacon Scanner
```bash
node quick_start.js
```
This detects beacons and stores them in DynamoDB.

### Terminal 2: Dashboard Server
```bash
node dashboard-server.js
```
This serves the web dashboard.

## 🤖 Run as Background Services (Raspberry Pi)

### Install Dashboard Service
```bash
sudo tee /etc/systemd/system/beacon-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=Beacon Dashboard Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/beaconjs
ExecStart=/usr/bin/node dashboard-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### Enable and Start Both Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable beacon-scanner beacon-dashboard
sudo systemctl start beacon-scanner beacon-dashboard
```

### Check Status
```bash
sudo systemctl status beacon-scanner
sudo systemctl status beacon-dashboard
```

### View Logs
```bash
# Scanner logs
sudo journalctl -u beacon-scanner -f

# Dashboard logs
sudo journalctl -u beacon-dashboard -f
```

## 📱 Mobile Access

The dashboard is fully responsive and works great on:
- 📱 Smartphones
- 📱 Tablets
- 💻 Laptops
- 🖥️ Desktops

Just open the URL in any browser!

## 🔧 Troubleshooting

### Dashboard Won't Load
```bash
# Check if server is running
ps aux | grep dashboard-server

# Restart the server
node dashboard-server.js
```

### No Beacons Showing
```bash
# Check if scanner is running
ps aux | grep quick_start

# Check recent detections
aws dynamodb scan --table-name BeaconRecords --select COUNT --region us-east-1
```

### Can't Access from Phone
```bash
# Check firewall (if enabled)
sudo ufw allow 3000

# Verify Pi's IP address
hostname -I
```

## 🎯 What's Next?

1. ✅ Dashboard is running
2. ✅ Beacons are being detected
3. ✅ Data is stored in DynamoDB
4. 📱 Access from any device on your network
5. 🚀 Deploy to multiple Raspberry Pis with unique Gateway IDs

## 📚 More Information

- Full documentation: `DASHBOARD_README.md`
- Raspberry Pi setup: `RASPBERRY_PI_INSTALL.md`
- Multi-gateway guide: `GATEWAY_SETUP_GUIDE.md`

## 🎉 You're All Set!

Your beacon monitoring system is now complete with:
- ✅ Real-time beacon detection
- ✅ Cloud storage (DynamoDB)
- ✅ Beautiful web dashboard
- ✅ Multi-gateway support
- ✅ Mobile-friendly interface

Enjoy monitoring your beacons! 🎯📡
