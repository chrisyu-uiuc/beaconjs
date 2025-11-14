#!/usr/bin/env python3
"""
Script to clear all records from BeaconRecords DynamoDB table
"""

import boto3
import sys

TABLE_NAME = "BeaconRecords"
REGION = "us-east-1"

def main():
    print(f"=== Clearing all records from {TABLE_NAME} ===")
    print()
    
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    # Get count
    response = table.scan(Select='COUNT')
    count = response['Count']
    
    print(f"Found {count} records to delete")
    print()
    
    # Confirm
    confirm = input("Are you sure you want to delete all records? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled.")
        sys.exit(0)
    
    print("Deleting records...")
    print()
    
    # Scan and delete
    deleted = 0
    scan_kwargs = {
        'ProjectionExpression': 'recordId, #ts',
        'ExpressionAttributeNames': {'#ts': 'timestamp'}
    }
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        if not items:
            break
        
        # Delete items
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(
                    Key={
                        'recordId': item['recordId'],
                        'timestamp': item['timestamp']
                    }
                )
                deleted += 1
                if deleted % 10 == 0:
                    print(f"Deleted {deleted} records...")
        
        # Check if there are more items
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print()
    print(f"=== Deletion Complete ===")
    print(f"Total deleted: {deleted} records")
    
    # Verify
    response = table.scan(Select='COUNT')
    remaining = response['Count']
    print(f"Remaining records: {remaining}")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
