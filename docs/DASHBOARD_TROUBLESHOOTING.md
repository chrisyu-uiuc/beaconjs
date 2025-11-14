# Dashboard Troubleshooting Guide

## Issue: Dashboard Shows "Loading..." or No Data

### Quick Fixes:

1. **Hard Refresh the Browser**
   - Chrome/Firefox: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`
   - This clears the cache and reloads all files

2. **Check API Endpoints**
   - Open test page: http://localhost:3000/dashboard/test.html
   - This will show if the API is working

3. **Check Browser Console**
   - Press `F12` to open Developer Tools
   - Go to "Console" tab
   - Look for any error messages (red text)

4. **Verify Services Are Running**
   ```bash
   # Check beacon scanner
   ps aux | grep quick_start
   
   # Check dashboard server
   ps aux | grep dashboard-server
   ```

## Common Issues and Solutions

### 1. "Loading..." Never Changes

**Cause:** JavaScript file not loading or API not responding

**Solution:**
```bash
# Restart dashboard server
# Press Ctrl+C in the terminal running dashboard-server.js
# Then restart:
node dashboard-server.js

# Hard refresh browser (Ctrl+Shift+R)
```

### 2. "Error loading data" or "Could not connect to API"

**Cause:** Dashboard server not running or wrong port

**Solution:**
```bash
# Check if server is running
lsof -i :3000

# If nothing, start the server
node dashboard-server.js

# Check server logs for errors
```

### 3. Gateway Info Shows "Error loading"

**Cause:** .env file not configured properly

**Solution:**
```bash
# Check .env file
cat .env | grep GATEWAY_ID

# Make sure these are set:
# GATEWAY_ID=gateway-001
# GATEWAY_NAME=Main Office Gateway
# GATEWAY_LOCATION=Building A, Main Entrance

# Restart dashboard server after fixing
```

### 4. No Beacons Showing (but API works)

**Cause:** No recent beacon detections in database

**Solution:**
```bash
# Check if beacon scanner is running
ps aux | grep quick_start

# If not running, start it
node quick_start.js

# Check if beacons are being detected
sudo journalctl -u beacon-scanner -n 20

# Verify records in DynamoDB
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --limit 5 \
  --region us-east-1
```

### 5. API Returns Empty Beacons Array

**Cause:** Records are older than 5 minutes

**Solution:**
The dashboard only shows beacons detected in the last 5 minutes. Either:
- Wait for new detections
- Or modify the time window in `dashboard-server.js`:
  ```javascript
  const fiveMinutesAgo = now - (30 * 60 * 1000); // Change to 30 minutes
  ```

### 6. Can't Access from Phone/Other Device

**Cause:** Firewall blocking port or wrong IP

**Solution:**
```bash
# Find your IP address
hostname -I

# Allow port 3000 through firewall
sudo ufw allow 3000

# Or disable firewall temporarily for testing
sudo ufw disable

# Access from phone using:
# http://[YOUR-IP]:3000
```

### 7. Dashboard Shows Old Data

**Cause:** Auto-refresh not working

**Solution:**
- Click the "🔄 Refresh" button manually
- Check browser console for JavaScript errors
- Hard refresh the page (Ctrl+Shift+R)

## Testing Steps

### Step 1: Test API Directly

```bash
# Test gateway info
curl http://localhost:3000/api/gateway-info

# Test beacons
curl http://localhost:3000/api/beacons
```

Expected output: JSON data (not HTML or error)

### Step 2: Test in Browser

1. Open: http://localhost:3000/dashboard/test.html
2. Click "Run All Tests"
3. Both tests should show green "✓ Success"

### Step 3: Check Browser Console

1. Open dashboard: http://localhost:3000
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. Look for errors (red text)
5. Look for successful API calls (should see 200 status)

### Step 4: Check Network Tab

1. Open dashboard: http://localhost:3000
2. Press F12 (Developer Tools)
3. Go to "Network" tab
4. Refresh page
5. Look for:
   - `/api/gateway-info` - should be 200 OK
   - `/api/beacons` - should be 200 OK
   - `/dashboard/dashboard.js` - should be 200 OK

## Verification Checklist

- [ ] Beacon scanner is running (`node quick_start.js`)
- [ ] Dashboard server is running (`node dashboard-server.js`)
- [ ] .env file has GATEWAY_ID set
- [ ] AWS credentials are configured
- [ ] DynamoDB table exists and has records
- [ ] Port 3000 is not blocked by firewall
- [ ] Browser cache is cleared (hard refresh)
- [ ] No errors in browser console
- [ ] API endpoints return JSON data

## Getting Help

If still not working:

1. **Collect Information:**
   ```bash
   # Check services
   ps aux | grep -E "(quick_start|dashboard-server)"
   
   # Check recent logs
   tail -50 ~/.pm2/logs/beacon-scanner-*.log
   
   # Test API
   curl -v http://localhost:3000/api/beacons
   
   # Check DynamoDB
   aws dynamodb scan --table-name BeaconRecords --select COUNT --region us-east-1
   ```

2. **Check Browser Console:**
   - Press F12
   - Copy any error messages

3. **Check Server Logs:**
   - Look at terminal where `dashboard-server.js` is running
   - Copy any error messages

## Quick Reset

If everything is broken, try a complete reset:

```bash
# Stop everything
pkill -f quick_start
pkill -f dashboard-server

# Clear browser cache completely
# In browser: Settings > Privacy > Clear browsing data

# Restart beacon scanner
node quick_start.js &

# Wait 10 seconds for some data
sleep 10

# Start dashboard
node dashboard-server.js

# Open in browser
# http://localhost:3000

# Hard refresh (Ctrl+Shift+R)
```

## Performance Issues

### Dashboard is Slow

**Solution:**
```javascript
// In dashboard/dashboard.js, increase refresh interval
const CONFIG = {
    refreshInterval: 10000, // Change from 5000 to 10000 (10 seconds)
};
```

### Too Many Records

**Solution:**
```javascript
// In dashboard-server.js, reduce query limit
Limit: 50 // Change from 100 to 50
```

## Browser Compatibility

Tested and working on:
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Still Not Working?

Try the test page first:
```
http://localhost:3000/dashboard/test.html
```

This will show exactly what's working and what's not.
