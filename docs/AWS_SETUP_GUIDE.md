# AWS Setup Guide for Beacon Scanner

This guide provides detailed instructions for setting up AWS resources required by the Beacon Scanner application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [DynamoDB Table Setup](#dynamodb-table-setup)
3. [IAM Configuration](#iam-configuration)
4. [Table Schema Reference](#table-schema-reference)
5. [Deployment Checklist](#deployment-checklist)
6. [Verification Steps](#verification-steps)

## Prerequisites

Before starting, ensure you have:

- An active AWS account
- AWS CLI installed (optional, but recommended)
- Basic understanding of AWS IAM and DynamoDB
- Your AWS account ID (found in AWS Console under "My Account")

## DynamoDB Table Setup

### Option 1: AWS Management Console

#### Step 1: Navigate to DynamoDB

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to **Services** → **Database** → **DynamoDB**
3. Select your desired region (e.g., `us-east-1`)

#### Step 2: Create Table

1. Click the **"Create table"** button
2. Configure table settings:

**Table Details:**
- **Table name**: `BeaconRecords`
- **Partition key**: `recordId` (Type: **String**)
- **Sort key**: `timestamp` (Type: **Number**)

**Table Settings:**
- **Table class**: DynamoDB Standard
- **Capacity mode**: **On-demand** (recommended)
  - Automatically scales with traffic
  - No capacity planning required
  - Pay only for what you use

**Alternative - Provisioned Capacity:**
If you prefer provisioned capacity for predictable workloads:
- **Read capacity units**: 5 (adjust based on expected read load)
- **Write capacity units**: 5 (adjust based on beacon detection rate)
- Enable **Auto Scaling** for both read and write capacity

**Encryption:**
- **Encryption at rest**: AWS owned key (default)
- For enhanced security, select **AWS managed key** or **Customer managed key**

**Additional Settings (Optional):**
- **Point-in-time recovery**: Enable for data protection
- **Time to Live (TTL)**: Configure if you want automatic data expiration
  - Attribute name: `expiresAt`
  - Set expiration timestamp in your application code

3. Click **"Create table"**
4. Wait for table status to become **"Active"** (usually takes 1-2 minutes)

### Option 2: AWS CLI

#### Basic Table Creation

```bash
aws dynamodb create-table \
  --table-name BeaconRecords \
  --attribute-definitions \
    AttributeName=recordId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=recordId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### With Point-in-Time Recovery

```bash
aws dynamodb create-table \
  --table-name BeaconRecords \
  --attribute-definitions \
    AttributeName=recordId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=recordId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name BeaconRecords \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region us-east-1
```

#### Verify Table Creation

```bash
aws dynamodb describe-table \
  --table-name BeaconRecords \
  --region us-east-1
```

### Option 3: CloudFormation Template

Create a file named `dynamodb-table.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'DynamoDB table for Beacon Scanner application'

Parameters:
  TableName:
    Type: String
    Default: BeaconRecords
    Description: Name of the DynamoDB table

Resources:
  BeaconRecordsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Ref TableName
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: recordId
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: N
      KeySchema:
        - AttributeName: recordId
          KeyType: HASH
        - AttributeName: timestamp
          KeyType: RANGE
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true
      Tags:
        - Key: Application
          Value: BeaconScanner
        - Key: Environment
          Value: Production

Outputs:
  TableName:
    Description: Name of the DynamoDB table
    Value: !Ref BeaconRecordsTable
  TableArn:
    Description: ARN of the DynamoDB table
    Value: !GetAtt BeaconRecordsTable.Arn
```

Deploy the template:

```bash
aws cloudformation create-stack \
  --stack-name beacon-scanner-dynamodb \
  --template-body file://dynamodb-table.yaml \
  --region us-east-1
```

## IAM Configuration

### Step 1: Create IAM Policy

#### Using AWS Console

1. Navigate to **IAM** → **Policies** → **Create policy**
2. Select the **JSON** tab
3. Paste the following policy (replace `YOUR_ACCOUNT_ID` and adjust region/table name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BeaconScannerDynamoDBAccess",
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

4. Click **Next: Tags** (optional)
5. Click **Next: Review**
6. **Policy name**: `BeaconScannerDynamoDBPolicy`
7. **Description**: `Allows Beacon Scanner application to write to DynamoDB`
8. Click **Create policy**

#### Using AWS CLI

Create a file named `beacon-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BeaconScannerDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/BeaconRecords"
    }
  ]
}
```

Create the policy:

```bash
aws iam create-policy \
  --policy-name BeaconScannerDynamoDBPolicy \
  --policy-document file://beacon-policy.json \
  --description "Allows Beacon Scanner application to write to DynamoDB"
```

### Step 2: Create IAM User

#### Using AWS Console

1. Navigate to **IAM** → **Users** → **Add users**
2. **User name**: `beacon-scanner-app`
3. **Access type**: Select **Programmatic access**
4. Click **Next: Permissions**
5. Select **Attach existing policies directly**
6. Search for and select `BeaconScannerDynamoDBPolicy`
7. Click **Next: Tags** (optional)
8. Click **Next: Review**
9. Click **Create user**
10. **IMPORTANT**: Save the **Access key ID** and **Secret access key** (you won't be able to see the secret again)

#### Using AWS CLI

```bash
# Create user
aws iam create-user --user-name beacon-scanner-app

# Attach policy (replace ACCOUNT_ID with your AWS account ID)
aws iam attach-user-policy \
  --user-name beacon-scanner-app \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/BeaconScannerDynamoDBPolicy

# Create access key
aws iam create-access-key --user-name beacon-scanner-app
```

Save the output containing `AccessKeyId` and `SecretAccessKey`.

### Step 3: Alternative - Use IAM Role (for EC2/ECS)

If running on AWS infrastructure (EC2, ECS, Lambda), use an IAM role instead:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BeaconScannerDynamoDBAccess",
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

Attach this policy to your EC2 instance role or ECS task role.

## Table Schema Reference

### Primary Key Structure

| Key Type | Attribute Name | Data Type | Description |
|----------|----------------|-----------|-------------|
| Partition Key (HASH) | `recordId` | String | UUID v4 identifier for each beacon record |
| Sort Key (RANGE) | `timestamp` | Number | Unix timestamp in milliseconds |

**Why this key structure?**
- `recordId` ensures even distribution across partitions
- `timestamp` as sort key enables efficient time-based queries
- Composite key prevents duplicate records

### Complete Attribute Schema

| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `recordId` | String | Yes | Unique record identifier (UUID v4) | `"550e8400-e29b-41d4-a716-446655440000"` |
| `timestamp` | Number | Yes | Unix timestamp in milliseconds | `1699564800000` |
| `detectedAt` | String | Yes | ISO 8601 datetime string | `"2024-11-09T12:00:00.000Z"` |
| `uuid` | String | Yes | Beacon UUID | `"FDA50693-A4E2-4FB1-AFCF-C6EB07647825"` |
| `major` | Number | Yes | Beacon major value | `100` |
| `minor` | Number | Yes | Beacon minor value | `50` |
| `rssi` | Number | Yes | Signal strength in dBm | `-65` |
| `txPower` | Number | No | Transmission power | `-59` |
| `distance` | Number | No | Estimated distance in meters | `2.5` |
| `proximity` | String | No | Proximity category | `"near"` |
| `address` | String | Yes | Bluetooth MAC address | `"AA:BB:CC:DD:EE:FF"` |
| `rawData` | Map | No | Complete advertisement object | `{ ... }` |

### Example Record

```json
{
  "recordId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1699564800000,
  "detectedAt": "2024-11-09T12:00:00.000Z",
  "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
  "major": 100,
  "minor": 50,
  "rssi": -65,
  "txPower": -59,
  "distance": 2.5,
  "proximity": "near",
  "address": "AA:BB:CC:DD:EE:FF",
  "rawData": {
    "uuid": "FDA50693-A4E2-4FB1-AFCF-C6EB07647825",
    "major": 100,
    "minor": 50,
    "measuredPower": -59,
    "rssi": -65,
    "accuracy": 2.5,
    "proximity": "near"
  }
}
```

## Deployment Checklist

Use this checklist to ensure proper AWS setup before deploying the application:

### AWS Infrastructure

- [ ] **DynamoDB Table Created**
  - [ ] Table name: `BeaconRecords` (or your custom name)
  - [ ] Partition key: `recordId` (String)
  - [ ] Sort key: `timestamp` (Number)
  - [ ] Billing mode: On-demand or Provisioned with auto-scaling
  - [ ] Table status: Active

- [ ] **IAM Configuration Complete**
  - [ ] IAM policy created with `dynamodb:PutItem` and `dynamodb:DescribeTable` permissions
  - [ ] IAM user created (or role for EC2/ECS)
  - [ ] Policy attached to user/role
  - [ ] Access key ID and secret access key generated and saved securely

- [ ] **Region Configuration**
  - [ ] DynamoDB table created in correct region
  - [ ] IAM policy ARN references correct region
  - [ ] Application configured with matching region

### Application Configuration

- [ ] **Environment Variables Set**
  - [ ] `AWS_REGION` configured
  - [ ] `AWS_ACCESS_KEY_ID` configured
  - [ ] `AWS_SECRET_ACCESS_KEY` configured
  - [ ] `BEACON_TABLE_NAME` configured (if using custom name)

- [ ] **Credentials Security**
  - [ ] Credentials stored securely (not in source code)
  - [ ] `.env` file added to `.gitignore`
  - [ ] Production credentials use IAM roles when possible

### Testing

- [ ] **Connection Test**
  - [ ] Application starts without configuration errors
  - [ ] DynamoDB connection validated successfully
  - [ ] No authentication errors in logs

- [ ] **Functionality Test**
  - [ ] Beacon detection working
  - [ ] Records appearing in DynamoDB table
  - [ ] Record structure matches schema
  - [ ] Timestamps are correct

- [ ] **Error Handling Test**
  - [ ] Retry logic works on temporary failures
  - [ ] Buffer mechanism activates when AWS unavailable
  - [ ] Graceful shutdown flushes buffered records

### Monitoring & Operations

- [ ] **CloudWatch Monitoring**
  - [ ] DynamoDB metrics visible in CloudWatch
  - [ ] Alarms configured for throttling (optional)
  - [ ] Alarms configured for errors (optional)

- [ ] **Logging**
  - [ ] Application logs captured
  - [ ] Log level appropriate for environment
  - [ ] Error logs monitored

- [ ] **Backup & Recovery**
  - [ ] Point-in-time recovery enabled (recommended)
  - [ ] Backup strategy documented
  - [ ] Recovery procedure tested

### Security

- [ ] **Least Privilege**
  - [ ] IAM policy grants only required permissions
  - [ ] No wildcard (*) resources in policy
  - [ ] Credentials rotated regularly

- [ ] **Encryption**
  - [ ] Encryption at rest enabled on DynamoDB table
  - [ ] Credentials transmitted securely
  - [ ] TLS used for AWS API calls (default in SDK)

### Documentation

- [ ] **Runbook Created**
  - [ ] Deployment steps documented
  - [ ] Troubleshooting guide available
  - [ ] Contact information for support

- [ ] **Configuration Documented**
  - [ ] AWS account ID recorded
  - [ ] Region documented
  - [ ] Table name documented
  - [ ] IAM user/role name documented

## Verification Steps

After completing setup, verify everything works correctly:

### 1. Test AWS Credentials

```bash
# Test credentials are valid
aws sts get-caller-identity --region us-east-1

# Expected output shows your user/role ARN
```

### 2. Verify Table Exists

```bash
# Check table status
aws dynamodb describe-table \
  --table-name BeaconRecords \
  --region us-east-1 \
  --query 'Table.[TableName,TableStatus,ItemCount]'

# Expected output: ["BeaconRecords", "ACTIVE", 0]
```

### 3. Test Write Permission

```bash
# Test writing a record
aws dynamodb put-item \
  --table-name BeaconRecords \
  --item '{
    "recordId": {"S": "test-record-123"},
    "timestamp": {"N": "1699564800000"},
    "detectedAt": {"S": "2024-11-09T12:00:00.000Z"},
    "uuid": {"S": "TEST-UUID"},
    "major": {"N": "1"},
    "minor": {"N": "1"},
    "rssi": {"N": "-65"},
    "address": {"S": "00:00:00:00:00:00"}
  }' \
  --region us-east-1

# If successful, no error is returned
```

### 4. Verify Record in Table

```bash
# Query the test record
aws dynamodb get-item \
  --table-name BeaconRecords \
  --key '{
    "recordId": {"S": "test-record-123"},
    "timestamp": {"N": "1699564800000"}
  }' \
  --region us-east-1
```

### 5. Clean Up Test Record

```bash
# Delete test record
aws dynamodb delete-item \
  --table-name BeaconRecords \
  --key '{
    "recordId": {"S": "test-record-123"},
    "timestamp": {"N": "1699564800000"}
  }' \
  --region us-east-1
```

### 6. Run Application

```bash
# Start the beacon scanner
node quick_start.js

# Expected output:
# - "AWS configuration validated"
# - "DynamoDB connection successful"
# - "Beacon scanner started"
```

## Troubleshooting

### Common Issues

**Issue**: `ResourceNotFoundException: Requested resource not found`
- **Solution**: Verify table name matches configuration and table exists in the correct region

**Issue**: `AccessDeniedException: User is not authorized to perform: dynamodb:PutItem`
- **Solution**: Check IAM policy is attached to user/role and resource ARN is correct

**Issue**: `ValidationException: One or more parameter values were invalid`
- **Solution**: Verify table schema matches expected structure (recordId as String, timestamp as Number)

**Issue**: `ProvisionedThroughputExceededException`
- **Solution**: Switch to on-demand billing mode or increase provisioned capacity

## Additional Resources

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## Support

For issues or questions:
1. Check application logs for error messages
2. Verify AWS setup using verification steps above
3. Review troubleshooting section
4. Check AWS Service Health Dashboard for service issues
