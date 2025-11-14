# Dashboard Changes - Records Counter

## What Changed

The "Total Records" metric has been updated to show **records detected since the dashboard server started**, instead of being capped at 100.

## Before vs After

### Before
- **Total Records**: Showed number of records retrieved (capped at 100)
- **Problem**: Always showed 100 even if there were more records
- **Confusing**: Didn't represent actual activity

### After
- **Records Since Start**: Counts all records detected since server started
- **Starts at 0**: When server starts, counter is at 0
- **Increments**: Increases as new beacons are detected
- **Shows Uptime**: Displays how long the server has been running

## New Display

```
┌─────────────────────────────────┐
│ Records Since Start             │
│         22                      │
│ Uptime: 32s                     │
└─────────────────────────────────┘
```

## How It Works

### Server Tracking

When the dashboard server starts:
```javascript
let serverStartTime = Date.now();  // Record start time
let totalRecordsSinceStart = 0;    // Initialize counter
```

On each API call:
```javascript
// Count records since server start
const countCommand = new QueryCommand({
    KeyConditionExpression: 'gatewayId = :gid AND #ts > :startTime',
    ExpressionAttributeValues: {
        ':startTime': serverStartTime  // Only count records after server start
    },
    Select: 'COUNT'  // Only get count, not full records
});
```

### What Gets Counted

✅ **Counted:**
- All beacon detections from this gateway
- Since the dashboard server started
- Includes all beacons (even if same beacon detected multiple times)

❌ **Not Counted:**
- Records from before server started
- Records from other gateways
- Records older than server start time

## Example Timeline

```
Time    Event                           Records Since Start
────────────────────────────────────────────────────────────
0:00    Dashboard server starts         0
0:05    Beacon A detected               1
0:10    Beacon B detected               2
0:15    Beacon A detected again         3
0:20    Beacon C detected               4
0:25    Beacon A detected again         5
0:30    Current count                   5
```

## Benefits

### 1. Accurate Counter
- Shows actual number of detections
- Not capped at 100
- Reflects real activity

### 2. Activity Monitoring
- See how active your gateway is
- Track detection rate over time
- Useful for debugging

### 3. Server Uptime
- Know how long server has been running
- Helps understand the counter context
- Useful for troubleshooting

## Uptime Format

The uptime is displayed in human-readable format:

| Uptime | Display |
|--------|---------|
| 0-59 seconds | `15s` |
| 1-59 minutes | `5m 30s` |
| 1+ hours | `2h 15m` |

## Performance Impact

### DynamoDB Queries

Each API call now makes **2 queries**:

1. **Display Query** (existing)
   - Gets last 100 records for display
   - Used to show beacon cards

2. **Count Query** (new)
   - Counts records since server start
   - Uses `SELECT: 'COUNT'` (efficient)
   - Only returns a number, not full records

### Cost Impact

- **Before**: 1 query per API call
- **After**: 2 queries per API call
- **Cost increase**: ~2x (still very low)
- **Monthly cost**: ~$0.26/month (was $0.13/month)

Still very affordable! 💰

## Resetting the Counter

The counter resets when you restart the dashboard server:

```bash
# Stop server (Ctrl+C)
# Start server again
./scripts/start-dashboard.sh

# Counter starts at 0 again
```

## Viewing Historical Total

To see the total number of records ever stored (not just since server start):

```bash
# All records for this gateway
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --select COUNT \
  --region us-east-1

# All records in database (all gateways)
aws dynamodb scan \
  --table-name BeaconRecords \
  --select COUNT \
  --region us-east-1
```

## Use Cases

### 1. Testing
Start server, test beacon detection, see how many records were created.

### 2. Monitoring
Track detection rate: records/uptime = detections per second

### 3. Debugging
If counter isn't increasing, beacons aren't being detected.

### 4. Performance
High counter with short uptime = high detection rate

## Example Scenarios

### Scenario 1: Low Activity
```
Records Since Start: 50
Uptime: 10m
Rate: 5 records/minute
Status: Normal for 1-2 beacons
```

### Scenario 2: High Activity
```
Records Since Start: 500
Uptime: 10m
Rate: 50 records/minute
Status: Normal for 5-10 beacons
```

### Scenario 3: No Activity
```
Records Since Start: 0
Uptime: 5m
Rate: 0 records/minute
Status: Check if beacon scanner is running
```

## Troubleshooting

### Counter Not Increasing

**Problem**: Counter stays at 0

**Solutions:**
1. Check if beacon scanner is running: `ps aux | grep quick_start`
2. Check scanner logs: `sudo journalctl -u beacon-scanner -n 20`
3. Verify beacons are nearby and powered on
4. Check AWS credentials are valid

### Counter Resets Unexpectedly

**Problem**: Counter goes back to 0

**Cause**: Dashboard server restarted

**Solutions:**
- Check server logs for crashes
- Ensure server is running as a service
- Check system resources (memory, CPU)

### Counter Too High

**Problem**: Counter increases very fast

**Possible Causes:**
- Many beacons nearby (normal)
- Beacons advertising frequently (normal)
- Multiple beacon scanners writing to same gateway ID (check configuration)

## Summary

✅ **What Changed:**
- "Total Records" → "Records Since Start"
- Counter starts at 0 when server starts
- Shows actual detection count (not capped)
- Displays server uptime

✅ **Benefits:**
- More accurate
- Better for monitoring
- Useful for debugging
- Shows real activity

✅ **Cost:**
- Minimal increase (~$0.13/month extra)
- Still very affordable
- Worth it for better insights

🎯 **Result:**
You now have a meaningful counter that shows actual beacon detection activity!
