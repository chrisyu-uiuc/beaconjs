# Multi-Gateway Beacon Scanner Setup Guide

## Overview

This guide walks you through setting up multiple beacon scanner gateways that all write to the same AWS DynamoDB table. Each gateway will have a unique identifier and can track its own location.

## Prerequisites

- Node.js installed on each gateway device
- AWS account with DynamoDB access
- AWS credentials configured (either via environment variables or `~/.aws/credentials`)
- Bluetooth capability on each gateway device

## Step 1: AWS Setup (One-Time)

### 1.1 Create DynamoDB Table

Run this command once to create the shared table:

```bash
aws dynamodb create-table \
  --table-name BeaconRecords \
  --attribute-definitions \
    AttributeName=recordId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
    AttributeName=gatewayId,AttributeType=S \
    AttributeName=beaconKey,AttributeType=S \
  --key-schema \
    AttributeName=recordId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"GatewayIndex\",
        \"KeySchema\": [
          {\"AttributeName\":\"gatewayId\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"BeaconIndex\",
        \"KeySchema\": [
          {\"AttributeName\":\"beaconKey\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"timestamp\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.2 Verify Table Creation

```bash
aws dynamodb describe-table \
  --table-name BeaconRecords \
  --region us-east-1 \
  --query 'Table.[TableName,TableStatus]'
```

Expected output: `["BeaconRecords", "ACTIVE"]`

### 1.3 Configure IAM Permissions

Each gateway needs permissions to write to DynamoDB. Create an IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/BeaconRecords"
    }
  ]
}
```

## Step 2: Install Application on Each Gateway

### 2.1 Clone/Copy the Application

On each gateway device:

```bash
# Clone or copy your beacon scanner application
cd /path/to/beaconjs

# Install dependencies
npm install
```

### 2.2 Verify Dependencies

Make sure these packages are installed:

```bash
npm list --depth=0
```

You should see:
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`
- `dotenv`
- `node-beacon-scanner`
- `uuid`

## Step 3: Configure Each Gateway

### 3.1 Gateway 1 Configuration

Create/edit `.env` file on Gateway 1:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# Optional: Leave commented to use AWS credential chain (~/.aws/credentials)
# AWS_ACCESS_KEY_ID=your_access_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_key_here

# DynamoDB Table
BEACON_TABLE_NAME=BeaconRecords

# Gateway Configuration - UNIQUE FOR EACH GATEWAY
GATEWAY_ID=gateway-001
GATEWAY_NAME=Main Entrance Gateway
GATEWAY_LOCATION=Building A, Main Entrance
```

### 3.2 Gateway 2 Configuration

Create/edit `.env` file on Gateway 2:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# DynamoDB Table
BEACON_TABLE_NAME=BeaconRecords

# Gateway Configuration - UNIQUE FOR EACH GATEWAY
GATEWAY_ID=gateway-002
GATEWAY_NAME=Warehouse Gateway
GATEWAY_LOCATION=Warehouse, Loading Dock
```

### 3.3 Gateway 3 Configuration

Create/edit `.env` file on Gateway 3:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# DynamoDB Table
BEACON_TABLE_NAME=BeaconRecords

# Gateway Configuration - UNIQUE FOR EACH GATEWAY
GATEWAY_ID=gateway-003
GATEWAY_NAME=Office Floor 2 Gateway
GATEWAY_LOCATION={"building":"A","floor":2,"room":"201"}
```

### 3.4 Gateway Location Format Options

You can use any of these formats for `GATEWAY_LOCATION`:

**Simple Description:**
```bash
GATEWAY_LOCATION=Building A, Main Entrance
```

**Coordinates (lat,lng):**
```bash
GATEWAY_LOCATION=40.7128,-74.0060
```

**JSON Object:**
```bash
GATEWAY_LOCATION={"building":"A","floor":2,"room":"201","lat":40.7128,"lng":-74.0060}
```

## Step 4: Configure AWS Credentials

### Option A: Using AWS Credential File (Recommended)

On each gateway, configure AWS credentials:

```bash
# Create AWS credentials directory
mkdir -p ~/.aws

# Create credentials file
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

# Set proper permissions
chmod 600 ~/.aws/credentials
```

### Option B: Using Environment Variables

Uncomment and set in `.env`:

```bash
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
```

**⚠️ Security Note:** Never commit `.env` files with real credentials to version control!

## Step 5: Test Each Gateway

### 5.1 Test Gateway Configuration

On each gateway, run:

```bash
node quick_start.js
```

### 5.2 Expected Output

You should see:

```
=== Beacon Scanner with AWS Storage ===
[Application] Starting initialization...
[Application] Loading AWS configuration...
[AWSConfig] Validating AWS configuration...
[AWSConfig] Region validation passed: us-east-1
[AWSConfig] Gateway ID validation passed: gateway-001
[AWSConfig] Gateway Name: Main Entrance Gateway
[AWSConfig] Gateway Location: Building A, Main Entrance
[AWSConfig] Configuration validation successful
[Application] AWS Configuration Summary:
[Application]   Region: us-east-1
[Application]   DynamoDB Table: BeaconRecords
[Application]   Credentials: Default chain
[Application] Initializing BeaconStorage service...
[BeaconStorage] Initializing storage service...
[BeaconStorage] Configuration validated - Region: us-east-1, Table: BeaconRecords
[BeaconStorage] Gateway ID: gateway-001, Name: Main Entrance Gateway
[BeaconStorage] Testing connection to DynamoDB table: BeaconRecords
[BeaconStorage] Successfully connected to DynamoDB table: BeaconRecords
[BeaconStorage] Table status: ACTIVE
[Application] BeaconStorage initialized successfully
[Application] Starting beacon scanner...
[Application] Beacon scanner started successfully
[Application] Listening for beacon advertisements...
```

### 5.3 Verify Beacon Detection

When a beacon is detected, you'll see:

```json
{
  "id": "f9954890c49cefc03a5c8cc3be80207c",
  "address": "",
  "localName": "MBeacon",
  "rssi": -76,
  "beaconType": "iBeacon",
  "iBeacon": {
    "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
    "major": 10001,
    "minor": 19641,
    "txPower": -59
  }
}
[BeaconStorage] Successfully stored beacon record: 33eb2661-b04a-4fee-9599-7c6308edbeee
[BeaconStorage] Gateway: gateway-001, Beacon: FDA50693-A4E2-4FB1-AFCF-C6EB07647825, RSSI: -76
```

## Step 6: Verify Data in DynamoDB

### 6.1 Check Record Count

```bash
aws dynamodb scan \
  --table-name BeaconRecords \
  --select COUNT \
  --region us-east-1
```

### 6.2 View Recent Records from a Specific Gateway

```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid" \
  --expression-attribute-values '{":gid":{"S":"gateway-001"}}' \
  --limit 5 \
  --scan-index-forward false \
  --region us-east-1
```

### 6.3 View All Gateways That Detected a Specific Beacon

```bash
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name BeaconIndex \
  --key-condition-expression "beaconKey = :bkey" \
  --expression-attribute-values '{":bkey":{"S":"FDA50693-A4E2-4FB1-AFCF-C6EB07647825-10001-19641"}}' \
  --region us-east-1
```

## Step 7: Run as a Service (Production)

### 7.1 Create Systemd Service (Linux)

Create `/etc/systemd/system/beacon-scanner.service`:

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

### 7.2 View Logs

```bash
# View real-time logs
sudo journalctl -u beacon-scanner -f

# View recent logs
sudo journalctl -u beacon-scanner -n 100
```

## Troubleshooting

### Error: "GATEWAY_ID is required"

**Problem:** Missing or empty `GATEWAY_ID` in `.env` file

**Solution:**
```bash
# Add to .env file
GATEWAY_ID=gateway-001
```

### Error: "Invalid AWS credentials"

**Problem:** AWS credentials are incorrect or not configured

**Solution:**
1. Check `~/.aws/credentials` file exists and has correct credentials
2. Or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`
3. Test credentials: `aws sts get-caller-identity`

### Error: "Table BeaconRecords does not exist"

**Problem:** DynamoDB table not created or wrong region

**Solution:**
1. Verify table exists: `aws dynamodb list-tables --region us-east-1`
2. Create table using command in Step 1.1
3. Check `AWS_REGION` matches table region

### Error: "Cannot find module 'dotenv'"

**Problem:** Missing dependencies

**Solution:**
```bash
npm install
```

### No Beacons Detected

**Problem:** Bluetooth not working or no beacons nearby

**Solution:**
1. Check Bluetooth is enabled: `hciconfig`
2. Test Bluetooth scanning: `sudo hcitool lescan`
3. Ensure beacons are powered on and nearby
4. Run with sudo if needed: `sudo node quick_start.js`

### Duplicate Gateway IDs

**Problem:** Two gateways using the same `GATEWAY_ID`

**Solution:**
- Each gateway MUST have a unique `GATEWAY_ID`
- Use naming convention: `gateway-001`, `gateway-002`, etc.
- Or use location-based IDs: `entrance-main`, `warehouse-dock`, etc.

## Monitoring and Maintenance

### Check Gateway Health

Query recent activity from each gateway:

```bash
# Check if gateway-001 is active (records in last 5 minutes)
aws dynamodb query \
  --table-name BeaconRecords \
  --index-name GatewayIndex \
  --key-condition-expression "gatewayId = :gid AND #ts > :time" \
  --expression-attribute-names '{"#ts":"timestamp"}' \
  --expression-attribute-values '{
    ":gid":{"S":"gateway-001"},
    ":time":{"N":"'$(($(date +%s) * 1000 - 300000))'"}
  }' \
  --select COUNT \
  --region us-east-1
```

### Monitor DynamoDB Costs

- Check AWS Console → DynamoDB → BeaconRecords → Metrics
- Monitor read/write capacity units
- On-demand billing charges per request

### Data Retention

Consider setting up DynamoDB TTL to auto-delete old records:

```bash
aws dynamodb update-time-to-live \
  --table-name BeaconRecords \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  --region us-east-1
```

Then add `expiresAt` field to records (Unix timestamp when record should expire).

## Gateway Naming Best Practices

### By Location
```
GATEWAY_ID=entrance-main
GATEWAY_ID=warehouse-loading
GATEWAY_ID=office-floor2
```

### By Number
```
GATEWAY_ID=gateway-001
GATEWAY_ID=gateway-002
GATEWAY_ID=gateway-003
```

### By Building/Zone
```
GATEWAY_ID=buildingA-entrance
GATEWAY_ID=buildingB-lobby
GATEWAY_ID=warehouse-zone1
```

## Next Steps

1. ✅ Deploy to all gateway devices
2. ✅ Verify each gateway is writing to DynamoDB
3. ✅ Set up as systemd service for auto-start
4. 📊 Build dashboard to visualize multi-gateway data
5. 📈 Implement analytics for beacon positioning
6. 🔔 Set up CloudWatch alarms for gateway health
7. 🗺️ Use RSSI from multiple gateways for triangulation

## Support

For issues:
1. Check application logs: `sudo journalctl -u beacon-scanner -n 100`
2. Verify AWS credentials: `aws sts get-caller-identity`
3. Test DynamoDB access: `aws dynamodb describe-table --table-name BeaconRecords --region us-east-1`
4. Check Bluetooth: `hciconfig` and `sudo hcitool lescan`
