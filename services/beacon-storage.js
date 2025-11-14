/**
 * Beacon Storage Service
 * Handles AWS DynamoDB interactions for storing beacon advertisement records
 */

const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

class BeaconStorage {
  /**
   * Creates a new BeaconStorage instance
   * @param {Object} config - AWS configuration object
   * @param {string} config.region - AWS region
   * @param {Object} config.credentials - AWS credentials (optional)
   * @param {string} config.tableName - DynamoDB table name
   * @param {string} config.gatewayId - Unique gateway identifier
   * @param {string} config.gatewayName - Human-readable gateway name (optional)
   * @param {string} config.gatewayLocation - Gateway location info (optional)
   */
  constructor(config) {
    this.config = config;
    this.tableName = config.tableName;
    this.gatewayId = config.gatewayId;
    this.gatewayName = config.gatewayName || config.gatewayId;
    this.gatewayLocation = config.gatewayLocation ? this._parseLocation(config.gatewayLocation) : null;
    
    // Initialize DynamoDB client
    const client = new DynamoDBClient({
      region: config.region,
      credentials: config.credentials
    });
    
    // Initialize DocumentClient for simplified operations
    this.docClient = DynamoDBDocumentClient.from(client);
    
    // Initialize buffer for offline resilience
    this.buffer = [];
    this.maxBufferSize = 100;
    this.isFlushing = false;
    this.droppedRecordCount = 0;
  }

  /**
   * Parse location string to object
   * Supports formats: "lat,lng" or "room:Building A" or JSON string
   * @param {string} locationStr - Location string
   * @returns {Object} Parsed location object
   * @private
   */
  _parseLocation(locationStr) {
    try {
      // Try parsing as JSON first
      return JSON.parse(locationStr);
    } catch {
      // Check if it's lat,lng format
      if (locationStr.includes(',')) {
        const [lat, lng] = locationStr.split(',').map(s => s.trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
      }
      // Otherwise return as string description
      return { description: locationStr };
    }
  }

  /**
   * Retry wrapper with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {number} maxAttempts - Maximum retry attempts (default: 3)
   * @returns {Promise<Object>} Result object with success status and data/error
   */
  async _retryWithBackoff(operation, maxAttempts = 3) {
    const retryableErrors = [
      'ServiceUnavailable',
      'ProvisionedThroughputExceededException',
      'RequestTimeout',
      'NetworkingError'
    ];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        const isRetryable = retryableErrors.some(errType => 
          error.name === errType || error.code === errType
        );
        
        if (!isRetryable || attempt === maxAttempts) {
          console.error(`[BeaconStorage] Operation failed after ${attempt} attempt(s)`);
          console.error(`[BeaconStorage] Error: ${error.message}`);
          console.error(`[BeaconStorage] Retryable: ${isRetryable}`);
          return { success: false, error };
        }
        
        // Calculate exponential backoff delay: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[BeaconStorage] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay`);
        console.warn(`[BeaconStorage] Retry reason: ${error.name || error.code} - ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Stores a beacon advertisement record to DynamoDB
   * @param {Object} advertisement - Beacon advertisement data
   * @returns {Promise<string>} Record ID if successful, null if failed
   */
  async storeBeaconRecord(advertisement) {
    try {
      // Generate unique record ID
      const recordId = uuidv4();
      const timestamp = Date.now();
      const detectedAt = new Date(timestamp).toISOString();
      
      // Create beacon key for querying (uuid-major-minor)
      const beaconKey = advertisement.iBeacon 
        ? `${advertisement.iBeacon.uuid}-${advertisement.iBeacon.major}-${advertisement.iBeacon.minor}`
        : `unknown-${advertisement.id}`;

      // Transform advertisement data to match DynamoDB schema
      const record = {
        recordId,
        timestamp,
        detectedAt,
        gatewayId: this.gatewayId,
        gatewayName: this.gatewayName,
        gatewayLocation: this.gatewayLocation,
        beaconKey,
        uuid: advertisement.iBeacon?.uuid || null,
        major: advertisement.iBeacon?.major || null,
        minor: advertisement.iBeacon?.minor || null,
        rssi: advertisement.rssi || null,
        txPower: advertisement.iBeacon?.txPower || null,
        distance: advertisement.iBeacon?.distance || null,
        proximity: advertisement.iBeacon?.proximity || null,
        address: advertisement.address || null,
        rawData: advertisement
      };
      
      // Attempt to store with retry logic
      const operation = async () => {
        const command = new PutCommand({
          TableName: this.tableName,
          Item: record
        });
        return await this.docClient.send(command);
      };
      
      const result = await this._retryWithBackoff(operation);
      
      if (result.success) {
        console.log(`[BeaconStorage] Successfully stored beacon record: ${recordId}`);
        console.log(`[BeaconStorage] Gateway: ${this.gatewayId}, Beacon: ${record.uuid}, RSSI: ${record.rssi}`);
        return recordId;
      } else {
        // Storage failed after retries, add to buffer
        console.error('[BeaconStorage] AWS Storage Service Error - Failed to store record after retries');
        console.error(`[BeaconStorage] Record ID: ${recordId}`);
        console.error(`[BeaconStorage] Error Code: ${result.error.code || result.error.name || 'Unknown'}`);
        console.error(`[BeaconStorage] Error Message: ${result.error.message}`);
        console.error(`[BeaconStorage] Table Name: ${this.tableName}`);
        console.error(`[BeaconStorage] Region: ${this.config.region}`);
        if (result.error.stack) {
          console.error(`[BeaconStorage] Stack Trace: ${result.error.stack}`);
        }
        this._addToBuffer(record);
        return null;
      }
    } catch (error) {
      // Catch any unexpected errors to prevent propagation
      console.error('[BeaconStorage] Unexpected error in storeBeaconRecord');
      console.error(`[BeaconStorage] Error Type: ${error.constructor.name}`);
      console.error(`[BeaconStorage] Error Code: ${error.code || error.name || 'Unknown'}`);
      console.error(`[BeaconStorage] Error Message: ${error.message}`);
      if (error.stack) {
        console.error(`[BeaconStorage] Stack Trace: ${error.stack}`);
      }
      return null;
    }
  }


  /**
   * Adds a record to the local buffer with FIFO overflow handling
   * @param {Object} record - Beacon record to buffer
   * @private
   */
  _addToBuffer(record) {
    // Check if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      // Drop oldest record (FIFO)
      const droppedRecord = this.buffer.shift();
      this.droppedRecordCount++;
      console.warn(`[BeaconStorage] Buffer overflow - Dropped oldest record`);
      console.warn(`[BeaconStorage] Dropped Record ID: ${droppedRecord.recordId}`);
      console.warn(`[BeaconStorage] Dropped Record Timestamp: ${droppedRecord.detectedAt}`);
      console.warn(`[BeaconStorage] Total records dropped since startup: ${this.droppedRecordCount}`);
    }
    
    this.buffer.push(record);
    console.log(`[BeaconStorage] Record added to local buffer`);
    console.log(`[BeaconStorage] Record ID: ${record.recordId}`);
    console.log(`[BeaconStorage] Buffer size: ${this.buffer.length}/${this.maxBufferSize}`);
  }
  
  /**
   * Gets the current buffer size
   * @returns {number} Number of records in buffer
   */
  getBufferSize() {
    return this.buffer.length;
  }

  /**
   * Flushes buffered records to DynamoDB
   * Processes records in chronological order
   * @returns {Promise<Object>} Flush results with success/failure counts
   */
  async flushBuffer() {
    // Prevent concurrent flushes
    if (this.isFlushing) {
      console.log('[BeaconStorage] Flush already in progress, skipping');
      return { success: 0, failed: 0, skipped: true };
    }
    
    if (this.buffer.length === 0) {
      console.log('[BeaconStorage] Buffer is empty, nothing to flush');
      return { success: 0, failed: 0, empty: true };
    }
    
    this.isFlushing = true;
    console.log(`[BeaconStorage] Starting buffer flush`);
    console.log(`[BeaconStorage] Records to process: ${this.buffer.length}`);
    
    let successCount = 0;
    let failedCount = 0;
    const recordsToProcess = [...this.buffer]; // Copy buffer
    
    // Process records in chronological order (already in order due to FIFO)
    for (const record of recordsToProcess) {
      try {
        const operation = async () => {
          const command = new PutCommand({
            TableName: this.tableName,
            Item: record
          });
          return await this.docClient.send(command);
        };
        
        const result = await this._retryWithBackoff(operation);
        
        if (result.success) {
          successCount++;
          console.log(`[BeaconStorage] Successfully flushed record: ${record.recordId}`);
          // Remove successfully stored record from buffer
          const index = this.buffer.findIndex(r => r.recordId === record.recordId);
          if (index !== -1) {
            this.buffer.splice(index, 1);
          }
        } else {
          failedCount++;
          // Log error details for failed flush
          console.error(`[BeaconStorage] Failed to flush buffered record`);
          console.error(`[BeaconStorage] Record ID: ${record.recordId}`);
          console.error(`[BeaconStorage] Record Timestamp: ${record.detectedAt}`);
          console.error(`[BeaconStorage] Error Code: ${result.error.code || result.error.name || 'Unknown'}`);
          console.error(`[BeaconStorage] Error Message: ${result.error.message}`);
        }
      } catch (error) {
        // Catch any unexpected errors to prevent propagation
        console.error(`[BeaconStorage] Unexpected error flushing buffered record`);
        console.error(`[BeaconStorage] Record ID: ${record.recordId}`);
        console.error(`[BeaconStorage] Error Type: ${error.constructor.name}`);
        console.error(`[BeaconStorage] Error Code: ${error.code || error.name || 'Unknown'}`);
        console.error(`[BeaconStorage] Error Message: ${error.message}`);
        if (error.stack) {
          console.error(`[BeaconStorage] Stack Trace: ${error.stack}`);
        }
        failedCount++;
      }
    }
    
    this.isFlushing = false;
    console.log(`[BeaconStorage] Buffer flush complete`);
    console.log(`[BeaconStorage] Successfully flushed: ${successCount} record(s)`);
    console.log(`[BeaconStorage] Failed to flush: ${failedCount} record(s)`);
    console.log(`[BeaconStorage] Remaining in buffer: ${this.buffer.length} record(s)`);
    
    return { success: successCount, failed: failedCount };
  }


  /**
   * Initializes the storage service and validates configuration
   * Tests DynamoDB connection
   * @returns {Promise<void>}
   * @throws {Error} If configuration is invalid or connection fails
   */
  async initialize() {
    console.log('[BeaconStorage] Initializing storage service...');
    
    // Validate configuration
    if (!this.config.region) {
      console.error('[BeaconStorage] Configuration validation failed: Missing AWS region');
      throw new Error('AWS region is required in configuration');
    }
    
    if (!this.tableName) {
      console.error('[BeaconStorage] Configuration validation failed: Missing DynamoDB table name');
      throw new Error('DynamoDB table name is required in configuration');
    }
    
    if (!this.gatewayId) {
      console.error('[BeaconStorage] Configuration validation failed: Missing gateway ID');
      throw new Error('Gateway ID is required in configuration');
    }
    
    console.log(`[BeaconStorage] Configuration validated - Region: ${this.config.region}, Table: ${this.tableName}`);
    console.log(`[BeaconStorage] Gateway ID: ${this.gatewayId}, Name: ${this.gatewayName}`);
    
    // Test DynamoDB connection by describing the table
    try {
      const client = new DynamoDBClient({
        region: this.config.region,
        credentials: this.config.credentials
      });
      
      const command = new DescribeTableCommand({
        TableName: this.tableName
      });
      
      console.log(`[BeaconStorage] Testing connection to DynamoDB table: ${this.tableName}`);
      const response = await client.send(command);
      console.log(`[BeaconStorage] Successfully connected to DynamoDB table: ${this.tableName}`);
      console.log(`[BeaconStorage] Table status: ${response.Table.TableStatus}`);
      console.log(`[BeaconStorage] Table item count: ${response.Table.ItemCount || 0}`);
      
      if (response.Table.TableStatus !== 'ACTIVE') {
        console.error(`[BeaconStorage] Table is not in ACTIVE state: ${response.Table.TableStatus}`);
        throw new Error(`Table ${this.tableName} is not in ACTIVE state: ${response.Table.TableStatus}`);
      }
    } catch (error) {
      console.error('[BeaconStorage] Failed to initialize storage service');
      console.error(`[BeaconStorage] Error Type: ${error.constructor.name}`);
      console.error(`[BeaconStorage] Error Code: ${error.code || error.name || 'Unknown'}`);
      console.error(`[BeaconStorage] Error Message: ${error.message}`);
      
      if (error.name === 'ResourceNotFoundException') {
        console.error(`[BeaconStorage] DynamoDB table '${this.tableName}' does not exist`);
        console.error(`[BeaconStorage] Please create the table with the required schema`);
        throw new Error(`DynamoDB table '${this.tableName}' does not exist. Please create the table first.`);
      } else if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
        console.error('[BeaconStorage] Invalid AWS credentials detected');
        console.error('[BeaconStorage] Please verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
        throw new Error('Invalid AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
      } else if (error.name === 'CredentialsProviderError') {
        console.error('[BeaconStorage] AWS credentials not found');
        console.error('[BeaconStorage] Please configure credentials via environment variables or AWS credential files');
        throw new Error('AWS credentials not found. Please configure AWS credentials.');
      } else {
        console.error(`[BeaconStorage] Unexpected initialization error`);
        if (error.stack) {
          console.error(`[BeaconStorage] Stack Trace: ${error.stack}`);
        }
        throw new Error(`Failed to connect to DynamoDB: ${error.message}`);
      }
    }
  }
}

module.exports = BeaconStorage;
