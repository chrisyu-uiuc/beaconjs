# Beacon Scanner with AWS Storage

A Node.js application that scans for Bluetooth beacons and automatically stores advertisement data to AWS DynamoDB for historical analysis and pattern detection.

## Features

- Real-time Bluetooth beacon detection
- Automatic storage of beacon data to AWS DynamoDB
- Retry logic with exponential backoff for reliability
- Local buffering for offline resilience (up to 100 records)
- Graceful error handling and shutdown
- Configurable AWS credentials and region

## Prerequisites

- Node.js (v14 or higher)
- Bluetooth adapter (for beacon scanning)
- AWS account with DynamoDB access
- AWS credentials with appropriate permissions

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Configure AWS credentials (see Configuration section below)

3. Create DynamoDB table (see AWS Setup section below)

## Configuration

### Environment Variables

The application requires AWS configuration through environment variables. You can set these in your shell or use a `.env` file.

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_REGION` | AWS region where your DynamoDB table is located | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key ID for authentication | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key for authentication | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

#### Optional Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `BEACON_TABLE_NAME` | Name of the DynamoDB table to store beacon records | `BeaconRecords` |

### Example .env File

Create a `.env` file in the project root (this file should NOT be committed to version control):

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# DynamoDB Table (optional - defaults to 'BeaconRecords')
BEACON_TABLE_NAME=BeaconRecords
```

### Alternative: AWS Credentials File

Instead of environment variables, you can use the AWS credentials file located at `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = your_access_key_here
aws_secret_access_key = your_secret_key_here
```

And configure the region in `~/.aws/config`:

```ini
[default]
region = us-east-1
```

## AWS Setup

### 1. Create DynamoDB Table

You need to create a DynamoDB table to store beacon records. You can do this through the AWS Console or using the AWS CLI.

#### Using AWS Console

1. Go to the [DynamoDB Console](https://console.aws.amazon.com/dynamodb)
2. Click "Create table"
3. Configure the table:
   - **Table name**: `BeaconRecords` (or your custom name)
   - **Partition key**: `recordId` (String)
   - **Sort key**: `timestamp` (Number)
4. Table settings:
   - **Capacity mode**: On-demand (recommended for variable workloads)
   - **Encryption**: AWS owned key (or customer managed for enhanced security)
5. Click "Create table"

#### Using AWS CLI

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

### 2. Configure IAM Permissions

Your AWS credentials must have the following permissions to interact with DynamoDB.

#### Required IAM Policy

Create an IAM policy with the following JSON and attach it to your IAM user or role:

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

**Note**: Replace `YOUR_ACCOUNT_ID` with your AWS account ID and adjust the region and table name if different.

#### Creating IAM User (if needed)

If you don't have an IAM user for this application:

1. Go to [IAM Console](https://console.aws.amazon.com/iam)
2. Click "Users" → "Add users"
3. Enter username (e.g., `beacon-scanner-app`)
4. Select "Programmatic access"
5. Attach the policy created above
6. Save the Access Key ID and Secret Access Key

### 3. Table Schema

The application stores beacon records with the following structure:

| Attribute | Type | Description |
|-----------|------|-------------|
| `recordId` | String | Unique identifier (UUID v4) - Partition Key |
| `timestamp` | Number | Unix timestamp in milliseconds - Sort Key |
| `detectedAt` | String | ISO 8601 datetime when beacon was detected |
| `uuid` | String | Beacon UUID |
| `major` | Number | Beacon major value |
| `minor` | Number | Beacon minor value |
| `rssi` | Number | Received Signal Strength Indicator |
| `txPower` | Number | Transmission power |
| `distance` | Number | Estimated distance in meters |
| `proximity` | String | Proximity category (immediate/near/far) |
| `address` | String | Bluetooth MAC address |
| `rawData` | Object | Complete advertisement data |

## Usage

### Running the Application

```bash
node quick_start.js
```

The application will:
1. Validate AWS configuration
2. Initialize connection to DynamoDB
3. Start scanning for beacons
4. Automatically store detected beacon advertisements to DynamoDB

### Graceful Shutdown

Press `Ctrl+C` to stop the application. The shutdown process will:
1. Stop beacon scanning
2. Flush any buffered records to DynamoDB
3. Exit cleanly

## Error Handling

The application includes robust error handling:

- **Configuration Errors**: If AWS credentials are missing or invalid, the app will log an error and exit gracefully
- **Network Errors**: Temporary network issues trigger automatic retry with exponential backoff (up to 3 attempts)
- **AWS Service Unavailable**: Records are buffered locally (up to 100 records) and flushed when service becomes available
- **Buffer Overflow**: If buffer exceeds 100 records, oldest records are dropped (FIFO) with warning logs

## Monitoring

### Application Logs

The application logs important events:
- Successful record storage with `recordId`
- AWS errors with error codes and messages
- Buffer overflow events
- Retry attempts
- Shutdown and flush operations

### AWS CloudWatch

Monitor your DynamoDB table:
- Write capacity units consumed
- Throttled requests
- System errors
- Item count growth

## Deployment Checklist

Before deploying to production:

- [ ] DynamoDB table created with correct schema
- [ ] IAM permissions configured and tested
- [ ] Environment variables set or AWS credentials file configured
- [ ] AWS region matches your DynamoDB table location
- [ ] Table name in configuration matches actual table name
- [ ] Bluetooth adapter available and functional
- [ ] Application tested with beacon devices
- [ ] CloudWatch monitoring configured (optional but recommended)
- [ ] Log aggregation configured for production monitoring
- [ ] Backup and recovery strategy defined for DynamoDB table

## Troubleshooting

### "Missing AWS credentials" error

- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check AWS credentials file at `~/.aws/credentials`
- Ensure credentials have not expired

### "ResourceNotFoundException" error

- Verify the DynamoDB table exists in the specified region
- Check that `BEACON_TABLE_NAME` matches your actual table name
- Confirm the region in your configuration matches where the table was created

### "AccessDeniedException" error

- Verify IAM permissions include `dynamodb:PutItem` and `dynamodb:DescribeTable`
- Check the resource ARN in the IAM policy matches your table

### Records not appearing in DynamoDB

- Check application logs for errors
- Verify beacon scanner is detecting beacons (check console output)
- Confirm network connectivity to AWS
- Check CloudWatch metrics for throttling or errors

## License

ISC
