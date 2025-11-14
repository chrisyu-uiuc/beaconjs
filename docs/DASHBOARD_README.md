# Beacon Gateway Dashboard

A simple, real-time web dashboard to monitor nearby beacons detected by your gateway.

## Features

- 📊 **Real-time Updates** - Auto-refreshes every 5 seconds
- 📡 **Beacon List** - Shows all nearby beacons with signal strength
- 📈 **Statistics** - Total beacons, active beacons, strongest signal
- 🎨 **Beautiful UI** - Clean, modern interface with color-coded signal strength
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🚀 **Lightweight** - No external dependencies, runs on Raspberry Pi

## Quick Start

### 1. Start the Dashboard Server

```bash
./start-dashboard.sh
```

Or manually:
```bash
node dashboard-server.js
```

### 2. Open in Browser

Navigate to:
```
http://localhost:3000
```

Or from another device on the same network:
```
http://[raspberry-pi-ip]:3000
```

Example:
```
http://192.168.1.100:3000
```

## Dashboard Sections

### Header
- Gateway name and ID
- Gateway location
- Status indicator (Active/Inactive)

### Statistics Cards
- **Beacons Detected** - Total unique beacons seen in last 5 minutes
- **Active Now** - Beacons detected in last 30 seconds
- **Strongest Signal** - Best RSSI value currently
- **Total Records** - Number of detection records

### Beacon Cards
Each beacon shows:
- Beacon name (if available)
- UUID
- Major and Minor values
- RSSI (signal strength in dBm)
- Estimated distance
- Signal strength indicator (Strong/Medium/Weak)
- Time since last detection

## Signal Strength Indicators

- 🟢 **Strong** (Green): RSSI ≥ -60 dBm (Very close, < 1m)
- 🟡 **Medium** (Orange): RSSI -60 to -75 dBm (Nearby, 1-5m)
- 🔴 **Weak** (Red): RSSI < -75 dBm (Far, > 5m)

## API Endpoints

The dashboard server provides these API endpoints:

### GET /api/gateway-info
Returns gateway configuration:
```json
{
  "gatewayId": "gateway-001",
  "gatewayName": "Main Office Gateway",
  "gatewayLocation": "Building A, Main Entrance",
  "region": "us-east-1",
  "tableName": "BeaconRecords"
}
```

### GET /api/beacons
Returns recent beacon detections:
```json
{
  "beacons": [
    {
      "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
      "major": 10001,
      "minor": 19641,
      "rssi": -65,
      "txPower": -59,
      "name": "MBeacon",
      "lastSeen": 1763102549100,
      "detectedAt": "2025-11-14T06:42:29.100Z"
    }
  ],
  "uniqueBeacons": 5,
  "activeBeacons": 3,
  "strongestSignal": -65,
  "totalRecords": 42,
  "timestamp": 1763102549100
}
```

## Running on Raspberry Pi

### Option 1: Run Manually

```bash
# Start beacon scanner in one terminal
node quick_start.js

# Start dashboard in another terminal
node dashboard-server.js
```

### Option 2: Run Both as Services

Create dashboard service:
```bash
sudo nano /etc/systemd/system/beacon-dashboard.service
```

Add:
```ini
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
```

Enable both services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable beacon-scanner
sudo systemctl enable beacon-dashboard
sudo systemctl start beacon-scanner
sudo systemctl start beacon-dashboard
```

Check status:
```bash
sudo systemctl status beacon-scanner
sudo systemctl status beacon-dashboard
```

## Access from Other Devices

### Find Raspberry Pi IP Address

```bash
hostname -I
```

### Access Dashboard

From any device on the same network:
```
http://[raspberry-pi-ip]:3000
```

Example:
```
http://192.168.1.100:3000
```

### Port Forwarding (Optional)

To access from outside your network, configure port forwarding on your router:
- External Port: 3000
- Internal IP: [raspberry-pi-ip]
- Internal Port: 3000

## Customization

### Change Refresh Interval

Edit `dashboard/dashboard.js`:
```javascript
const CONFIG = {
    refreshInterval: 5000, // Change to desired milliseconds
    recentTimeWindow: 30000 // Time window for "active now"
};
```

### Change Port

Edit `dashboard-server.js`:
```javascript
const PORT = 3000; // Change to desired port
```

### Change Time Window

Edit `dashboard-server.js`:
```javascript
const fiveMinutesAgo = now - (5 * 60 * 1000); // Change time window
```

## Troubleshooting

### Dashboard Won't Load

**Check if server is running:**
```bash
ps aux | grep dashboard-server
```

**Check if port is in use:**
```bash
lsof -i :3000
```

**View server logs:**
```bash
# If running as service
sudo journalctl -u beacon-dashboard -f

# If running manually, check terminal output
```

### No Beacons Showing

**Check if beacon scanner is running:**
```bash
sudo systemctl status beacon-scanner
```

**Check if beacons are being detected:**
```bash
sudo journalctl -u beacon-scanner -n 50
```

**Verify DynamoDB has recent records:**
```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --limit 5 \
  --region us-east-1
```

### Can't Access from Other Devices

**Check firewall:**
```bash
# Allow port 3000
sudo ufw allow 3000
```

**Check if server is listening on all interfaces:**
```bash
netstat -an | grep 3000
```

### API Errors

**Check AWS credentials:**
```bash
aws sts get-caller-identity
```

**Check .env configuration:**
```bash
cat .env | grep GATEWAY_ID
```

## Screenshots

### Desktop View
- Full-width layout with grid of beacon cards
- Statistics cards at the top
- Color-coded signal strength indicators

### Mobile View
- Single column layout
- Touch-friendly buttons
- Responsive design

## Performance

- **Memory Usage**: ~50 MB
- **CPU Usage**: < 5% on Raspberry Pi 4
- **Network**: Minimal (only API calls every 5 seconds)
- **DynamoDB**: ~1 read per refresh (uses GSI for efficiency)

## Security Notes

⚠️ **Important**: This dashboard has no authentication. Consider:

1. **Firewall**: Only allow access from trusted networks
2. **VPN**: Use VPN for remote access
3. **Reverse Proxy**: Use nginx with basic auth
4. **HTTPS**: Use SSL certificate for encrypted connection

## Future Enhancements

Possible additions:
- [ ] Historical charts (signal strength over time)
- [ ] Beacon filtering and search
- [ ] Export data to CSV
- [ ] Email/SMS alerts for specific beacons
- [ ] Multi-gateway view (compare multiple gateways)
- [ ] Heatmap visualization
- [ ] Authentication/login

## Support

For issues:
1. Check server logs
2. Verify beacon scanner is running
3. Test API endpoints directly
4. Check browser console for errors
