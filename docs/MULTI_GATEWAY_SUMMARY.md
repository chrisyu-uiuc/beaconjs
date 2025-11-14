# Multi-Gateway Beacon Storage - Implementation Summary

## What Was Changed

### 1. DynamoDB Table Schema
The table was recreated with support for multiple gateways:

**Primary Key:**
- Partition Key: `recordId` (String) - UUID for each detection
- Sort Key: `timestamp` (Number) - Unix timestamp in milliseconds

**New Fields Added:**
- `gatewayId` (String) - Unique identifier for each gateway (e.g., "gateway-001")
- `gatewayName` (String) - Human-readable gateway name (e.g., "Main Office Gateway")
- `gatewayLocation` (Object) - Gateway location information
- `beaconKey` (String) - Composite key: "uuid-major-minor" for querying

**Global Secondary Indexes (GSI):**
1. **GatewayIndex** - Query all detections from a specific gateway
   - Partition Key: `gatewayId`
   - Sort Key: `timestamp`

2. **BeaconIndex** - Query all gateways that detected a specific beacon
   - Partition Key: `beaconKey`
   - Sort Key: `timestamp`

### 2. Configuration Changes

**New Environment Variables (.env):**
```bash
# Required for multi-gateway deployment
GATEWAY_ID=gateway-001

# Optional but recommended
GATEWAY_NAME=Main Office Gateway
GATEWAY_LOCATION=Building A, Main Entrance
```

**Location Format Options:**
- Coordinates: `"40.7128,-74.0060"`
- Description: `"Building A, Floor 2, Room 201"`
- JSON: `{"building":"A","floor":2,"room":"201","lat":40.7128,"lng":-74.0060}`

### 3. Code Changes

**config/aws-config.js:**
- Added gateway configuration loading
- Added gateway validation (GATEWAY_ID is now required)

**services/beacon-storage.js:**
- Added gateway fields to constructor
- Added `_parseLocation()` method for flexible location parsing
- Modified `storeBeaconRecord()` to include gateway info and beaconKey
- Updated logging to show gateway ID with each record

## Sample Data Structure

### Record with Gateway Information:
```json
{
  "recordId": "0027e7e4-e6f6-4c15-83be-98c2ce82c80d",
  "timestamp": 1763102846642,
  "detectedAt": "2025-11-14T06:47:26.642Z",
  
  "gatewayId": "gateway-001",
  "gatewayName": "Main Office Gateway",
  "gatewayLocation": {
    "description": "Building A, Main Entrance"
  },
  
  "beaconKey": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825-1-2",
  "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
  "major": 1,
  "minor": 2,
  "rssi": -86,
  "txPower": -40,
  
  "rawData": { ... }
}
```

## Querying Examples

### 1. Get all detections from a specific gateway:
```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --region us-east-1
```

### 2. Get all gateways that detected a specific beacon:
```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name BeaconIndex \
  --key-condition-expression "beaconKey = :bkey" \
  --expression-attribute-values '{":bkey":{"S":"FDA50693-A4E2-4FB1-AFCF-C6EB07647825-1-2"}}' \
  --region us-east-1
```

### 3. Get detections from a gateway within a time range:
```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid AND #ts BETWEEN :start AND :end" \
  --expression-attribute-names '{"#ts":"timestamp"}' \
  --expression-attribute-values '{
    ":gid":{"S":"gateway-001"},
    ":start":{"N":"1763102800000"},
    ":end":{"N":"1763102900000"}
  }' \
  --region us-east-1
```

## Deploying Multiple Gateways

### Gateway 1 (.env):
```bash
GATEWAY_ID=gateway-001
GATEWAY_NAME=Main Entrance Gateway
GATEWAY_LOCATION=Building A, Main Entrance
```

### Gateway 2 (.env):
```bash
GATEWAY_ID=gateway-002
GATEWAY_NAME=Warehouse Gateway
GATEWAY_LOCATION=Warehouse, Loading Dock
```

### Gateway 3 (.env):
```bash
GATEWAY_ID=gateway-003
GATEWAY_NAME=Office Floor 2 Gateway
GATEWAY_LOCATION={"building":"A","floor":2,"lat":40.7128,"lng":-74.0060}
```

## Benefits of This Structure

1. **Multi-Gateway Support**: Each gateway has a unique ID, so you can identify which gateway detected which beacon
2. **Location Tracking**: Store gateway location to enable proximity/positioning analysis
3. **Efficient Queries**: GSIs allow fast queries by gateway or by beacon
4. **Scalability**: Can support unlimited gateways writing to the same table
5. **Triangulation Ready**: With RSSI from multiple gateways, you can calculate beacon position

## Use Cases

1. **Asset Tracking**: Track which room/zone an asset (beacon) is in based on which gateway detected it
2. **People Counting**: Count people in different areas based on gateway detections
3. **Proximity Analysis**: Determine beacon location by comparing RSSI from multiple gateways
4. **Gateway Health Monitoring**: Track which gateways are active and detecting beacons
5. **Historical Analysis**: Query detection patterns over time per gateway or per beacon

## Current Status

✅ Table created with GSI support
✅ Code updated to include gateway information
✅ Configuration validated
✅ Successfully storing records with gateway data
✅ 107 records currently in database

## Next Steps

1. Deploy to additional gateways with unique GATEWAY_ID values
2. Implement querying logic in your application
3. Consider adding analytics/dashboard to visualize multi-gateway data
4. Set up CloudWatch alarms for gateway health monitoring
