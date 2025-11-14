# Dashboard API Call Frequency

## Current Configuration

### API Endpoints Called

The dashboard makes calls to two API endpoints:

1. **`/api/gateway-info`** - Gateway configuration
2. **`/api/beacons`** - Beacon detection data

### Call Frequency

#### Initial Load (Page Load)
When the dashboard first loads:
```
1. /api/gateway-info  → Called once
2. /api/beacons       → Called once
```

#### Auto-Refresh (Every 5 Seconds)
After initial load, the dashboard automatically refreshes:
```
/api/beacons → Called every 5 seconds
```

**Note:** `/api/gateway-info` is only called once on page load since gateway configuration doesn't change.

### Configuration

Located in `dashboard/dashboard.js`:

```javascript
const CONFIG = {
    apiUrl: '/api',
    refreshInterval: 5000,        // 5 seconds = 5000 milliseconds
    recentTimeWindow: 30000       // 30 seconds for "active now"
};
```

## API Call Summary

### Per Minute
- **`/api/beacons`**: 12 calls/minute (every 5 seconds)
- **`/api/gateway-info`**: 0 calls/minute (only on page load)

### Per Hour
- **`/api/beacons`**: 720 calls/hour
- **`/api/gateway-info`**: 0 calls/hour (unless page is refreshed)

### Per Day (24 hours)
- **`/api/beacons`**: 17,280 calls/day
- **`/api/gateway-info`**: ~0 calls/day (unless page is refreshed)

## DynamoDB Impact

Each `/api/beacons` call performs:
- **1 Query operation** on the `GatewayIndex` GSI
- Retrieves up to **100 records** from the last 5 minutes
- Uses **eventually consistent reads** (cheaper)

### DynamoDB Costs (Approximate)

With on-demand billing:
- **Query cost**: $0.25 per million requests
- **Daily cost**: 17,280 queries × $0.25 / 1,000,000 = **$0.00432/day**
- **Monthly cost**: ~**$0.13/month** per gateway

## Adjusting Refresh Frequency

### Make It Faster (More Frequent Updates)

Edit `dashboard/dashboard.js`:

```javascript
const CONFIG = {
    refreshInterval: 3000,  // 3 seconds (20 calls/minute)
};
```

### Make It Slower (Reduce API Calls)

Edit `dashboard/dashboard.js`:

```javascript
const CONFIG = {
    refreshInterval: 10000,  // 10 seconds (6 calls/minute)
};
```

### Disable Auto-Refresh

Edit `dashboard/dashboard.js`:

```javascript
// Comment out this line in the init() function:
// startAutoRefresh();
```

Then use the manual "🔄 Refresh" button.

## Monitoring API Calls

### View in Browser

1. Open dashboard: http://localhost:3000
2. Press **F12** (Developer Tools)
3. Go to **Network** tab
4. Filter by "beacons"
5. Watch requests appear every 5 seconds

### View in Server Logs

The dashboard server logs each request:

```bash
# If running manually
node dashboard-server.js

# If running as service
sudo journalctl -u beacon-dashboard -f
```

You'll see:
```
GET /api/beacons
GET /api/beacons
GET /api/beacons
...
```

### Count API Calls

```bash
# Count calls in last minute
sudo journalctl -u beacon-dashboard --since "1 minute ago" | grep "GET /api/beacons" | wc -l

# Expected: ~12 calls
```

## Performance Considerations

### Current Settings (5 seconds)
- ✅ Good balance between real-time and performance
- ✅ Low DynamoDB cost (~$0.13/month)
- ✅ Minimal server load
- ✅ Responsive user experience

### Faster (3 seconds)
- ✅ More real-time
- ⚠️ Higher DynamoDB cost (~$0.22/month)
- ⚠️ More server load

### Slower (10 seconds)
- ✅ Lower DynamoDB cost (~$0.065/month)
- ✅ Less server load
- ⚠️ Less real-time feel

### Manual Only (No auto-refresh)
- ✅ Minimal DynamoDB cost
- ✅ Minimal server load
- ❌ Not real-time
- ❌ User must click refresh

## Optimization Tips

### 1. Reduce Query Limit

In `dashboard-server.js`, reduce the number of records fetched:

```javascript
const command = new QueryCommand({
    // ...
    Limit: 50  // Change from 100 to 50
});
```

This reduces data transfer but still shows recent beacons.

### 2. Increase Time Window

Show beacons from last 10 minutes instead of 5:

```javascript
const tenMinutesAgo = now - (10 * 60 * 1000);  // Change from 5 to 10
```

This reduces query frequency needed for same data coverage.

### 3. Conditional Refresh

Only refresh when page is visible:

```javascript
// Already implemented in dashboard.js
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();  // Stop when tab is hidden
    } else {
        startAutoRefresh();  // Resume when tab is visible
    }
});
```

## Comparison with Other Refresh Rates

| Interval | Calls/Min | Calls/Hour | Calls/Day | Monthly Cost |
|----------|-----------|------------|-----------|--------------|
| 1 second | 60 | 3,600 | 86,400 | $0.65 |
| 3 seconds | 20 | 1,200 | 28,800 | $0.22 |
| **5 seconds** | **12** | **720** | **17,280** | **$0.13** ⭐ |
| 10 seconds | 6 | 360 | 8,640 | $0.065 |
| 30 seconds | 2 | 120 | 2,880 | $0.022 |
| 60 seconds | 1 | 60 | 1,440 | $0.011 |

⭐ = Current default setting

## Real-World Usage

### Single User
- **Impact**: Minimal
- **Cost**: ~$0.13/month
- **Recommendation**: Keep at 5 seconds

### Multiple Users (5 people)
- **Impact**: Low
- **Cost**: ~$0.65/month
- **Recommendation**: Keep at 5 seconds

### Many Users (20+ people)
- **Impact**: Moderate
- **Cost**: ~$2.60/month
- **Recommendation**: Consider 10 seconds or implement caching

### Public Dashboard
- **Impact**: High (depends on traffic)
- **Cost**: Variable
- **Recommendation**: Implement caching layer or increase to 10-30 seconds

## Caching Strategy (Advanced)

For high-traffic scenarios, implement server-side caching:

```javascript
// In dashboard-server.js
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 3000; // 3 seconds

async function handleBeacons(req, res) {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (cachedData && (now - cacheTime) < CACHE_TTL) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cachedData));
        return;
    }
    
    // Fetch fresh data
    const data = await fetchBeaconsFromDynamoDB();
    cachedData = data;
    cacheTime = now;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}
```

This reduces DynamoDB queries even with multiple users.

## Summary

**Current Configuration:**
- ✅ `/api/beacons` called every **5 seconds**
- ✅ **12 calls per minute**
- ✅ **~17,280 calls per day**
- ✅ **~$0.13/month** DynamoDB cost per gateway
- ✅ Good balance of real-time updates and cost

**To Change:**
Edit `refreshInterval` in `dashboard/dashboard.js` and restart the dashboard server.
