# Dashboard Metrics Explained

## Understanding the Dashboard Statistics

### 1. Beacons Detected (Unique Beacons)

**What it shows:** Number of unique beacons detected in the last 5 minutes

**How it's calculated:**
- Queries all records from this gateway in the last 5 minutes
- Groups by beacon identifier (UUID + Major + Minor)
- Counts unique beacons

**Example:**
- If beacon "ABC-1-2" was detected 50 times in 5 minutes
- And beacon "XYZ-3-4" was detected 30 times in 5 minutes
- **Beacons Detected = 2** (unique beacons)

---

### 2. Active Now

**What it shows:** Number of beacons detected in the last 30 seconds

**How it's calculated:**
- From the unique beacons list
- Filters those with `lastSeen` within last 30 seconds
- Counts them

**Example:**
- 5 unique beacons detected in last 5 minutes
- But only 3 were seen in the last 30 seconds
- **Active Now = 3**

---

### 3. Strongest Signal

**What it shows:** Best RSSI value among all detected beacons

**How it's calculated:**
- Looks at all unique beacons
- Finds the highest RSSI (least negative number)
- Displays in dBm

**Example:**
- Beacon A: -65 dBm
- Beacon B: -72 dBm
- Beacon C: -80 dBm
- **Strongest Signal = -65 dBm** (Beacon A)

**RSSI Scale:**
- -30 to -60 dBm: Excellent (very close)
- -60 to -75 dBm: Good (nearby)
- -75 to -90 dBm: Fair (far)
- Below -90 dBm: Poor (very far)

---

### 4. Total Records ⚠️

**What it shows:** Number of detection records retrieved from DynamoDB

**How it's calculated:**
- Queries DynamoDB for records from this gateway in last 5 minutes
- Limited to maximum 100 records
- Shows the count of raw detection records (not unique beacons)

**Example:**
- Beacon "ABC-1-2" detected 50 times
- Beacon "XYZ-3-4" detected 30 times
- Beacon "DEF-5-6" detected 20 times
- **Total Records = 100** (sum of all detections)

**Important Notes:**

⚠️ **This number is capped at 100** because the query has `Limit: 100`

If you see "Total Records: 100", it means:
- ✅ At least 100 detection records in the last 5 minutes
- ⚠️ There might be MORE records, but only 100 were retrieved
- ⚠️ This is NOT the total number of records in the database

---

## Why "Total Records: 100"?

### The Query Limit

In `dashboard-server.js`:

```javascript
const command = new QueryCommand({
    TableName: awsConfig.tableName,
    IndexName: 'GatewayIndex',
    KeyConditionExpression: 'gatewayId = :gid AND #ts > :time',
    // ...
    Limit: 100  // ← This limits the results
});
```

### Why Have a Limit?

1. **Performance** - Faster queries
2. **Cost** - Less data transfer from DynamoDB
3. **Efficiency** - Dashboard only needs recent data

### What If I Have More Than 100 Records?

The dashboard still works correctly because:
- It processes the 100 most recent records
- Groups them into unique beacons
- Shows the latest detection for each beacon

**Example with 200 records in 5 minutes:**
- Query retrieves: 100 most recent records
- Unique beacons: 5 beacons
- Dashboard shows: 5 beacons with their latest data
- Total Records shows: 100 (not 200)

---

## Actual Total Records in Database

To see the REAL total number of records in your database:

```bash
# Count all records for this gateway
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --select COUNT \
  --region us-east-1
```

Or count ALL records in the table:

```bash
aws dynamodb scan \
  --table-name BeaconRecords \
  --select COUNT \
  --region us-east-1
```

---

## Should I Increase the Limit?

### Current: Limit 100

**Pros:**
- ✅ Fast queries
- ✅ Low cost
- ✅ Sufficient for most use cases

**Cons:**
- ⚠️ Might miss some beacons if >100 records in 5 minutes

### Increase to 200 or 500

**Pros:**
- ✅ More complete data
- ✅ Better for high-traffic gateways

**Cons:**
- ⚠️ Slower queries
- ⚠️ Higher DynamoDB costs
- ⚠️ More data transfer

### How to Change

Edit `dashboard-server.js`:

```javascript
const command = new QueryCommand({
    // ...
    Limit: 200  // Change from 100 to 200
});
```

---

## When Does "Total Records: 100" Matter?

### Scenario 1: Low Traffic Gateway
- 10 beacons detected per minute
- 50 records in 5 minutes
- **Total Records: 50** ✅ Accurate

### Scenario 2: Medium Traffic Gateway
- 20 beacons detected per minute
- 100 records in 5 minutes
- **Total Records: 100** ✅ Accurate (exactly at limit)

### Scenario 3: High Traffic Gateway
- 50 beacons detected per minute
- 250 records in 5 minutes
- **Total Records: 100** ⚠️ Capped (missing 150 records)

In Scenario 3, you might want to increase the limit.

---

## Better Metric: Unique Beacons

Instead of focusing on "Total Records", look at:

### Beacons Detected (Unique Beacons)
This tells you how many different beacons are nearby, which is more useful than the raw record count.

**Example:**
- Total Records: 100
- Unique Beacons: 5
- **Interpretation:** 5 beacons detected multiple times (average 20 detections each)

---

## Summary

| Metric | What It Means | Is It Accurate? |
|--------|---------------|-----------------|
| **Beacons Detected** | Unique beacons in last 5 min | ✅ Yes |
| **Active Now** | Beacons seen in last 30 sec | ✅ Yes |
| **Strongest Signal** | Best RSSI value | ✅ Yes |
| **Total Records** | Detection records retrieved | ⚠️ Capped at 100 |

### Your Case: "Total Records: 100"

This means:
- ✅ Your gateway is actively detecting beacons
- ✅ At least 100 detections in the last 5 minutes
- ⚠️ There might be more than 100 (but query is limited)
- ✅ The dashboard still shows correct unique beacon data

**Recommendation:** 
- If you have many beacons (>10), consider increasing limit to 200
- If you have few beacons (<5), current limit of 100 is fine
- Focus on "Beacons Detected" metric instead of "Total Records"

---

## Alternative: Remove "Total Records" Display

If this metric is confusing, you can hide it from the dashboard.

Edit `dashboard/index.html` and remove:

```html
<div class="stat-card">
    <div class="stat-label">Total Records</div>
    <div class="stat-value" id="totalRecords">0</div>
</div>
```

Or rename it to "Records Retrieved (Last 5 min)" to be more accurate.
