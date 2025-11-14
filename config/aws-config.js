/**
 * AWS Configuration Module
 * Manages AWS credentials and configuration for the beacon storage service
 */

require('dotenv').config();

/**
 * Reads AWS configuration from environment variables
 * @returns {Object} Configuration object with AWS settings
 */
function getAWSConfig() {
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: undefined,
    tableName: process.env.BEACON_TABLE_NAME || 'BeaconRecords',
    gatewayId: process.env.GATEWAY_ID || null,
    gatewayName: process.env.GATEWAY_NAME || null,
    gatewayLocation: process.env.GATEWAY_LOCATION || null
  };

  // If explicit credentials are provided in environment, use them
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }
  // Otherwise, credentials will be undefined and AWS SDK will use default credential chain
  // (credential files, IAM roles, etc.)

  return config;
}

/**
 * Validates AWS configuration
 * Checks for required credentials and valid region format
 * @returns {boolean} True if configuration is valid, false otherwise
 */
function validateConfig() {
  console.log('[AWSConfig] Validating AWS configuration...');
  const config = getAWSConfig();

  // Check if region is provided and has valid format (e.g., us-east-1, eu-west-1)
  const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/;
  if (!config.region) {
    console.error('[AWSConfig] Configuration validation failed: AWS region is not set');
    console.error('[AWSConfig] Please set AWS_REGION environment variable');
    return false;
  }
  
  if (!regionPattern.test(config.region)) {
    console.error('[AWSConfig] Configuration validation failed: Invalid AWS region format');
    console.error(`[AWSConfig] Provided region: ${config.region}`);
    console.error('[AWSConfig] Expected format: xx-xxxx-# (e.g., us-east-1, eu-west-2)');
    return false;
  }
  
  console.log(`[AWSConfig] Region validation passed: ${config.region}`);

  // Validate gateway configuration
  if (!config.gatewayId) {
    console.error('[AWSConfig] Configuration validation failed: GATEWAY_ID is required');
    console.error('[AWSConfig] Please set GATEWAY_ID environment variable for multi-gateway deployment');
    return false;
  }
  console.log(`[AWSConfig] Gateway ID validation passed: ${config.gatewayId}`);
  
  if (!config.gatewayName) {
    console.warn(`[AWSConfig] Warning: GATEWAY_NAME not set, using GATEWAY_ID as name`);
  } else {
    console.log(`[AWSConfig] Gateway Name: ${config.gatewayName}`);
  }
  
  if (config.gatewayLocation) {
    console.log(`[AWSConfig] Gateway Location: ${config.gatewayLocation}`);
  }

  // If credentials are explicitly set in environment, validate them
  if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY) {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.error('[AWSConfig] Configuration validation failed: Incomplete credentials');
      console.error('[AWSConfig] AWS_SECRET_ACCESS_KEY is set but AWS_ACCESS_KEY_ID is missing');
      console.error('[AWSConfig] Both credentials must be provided together');
      return false;
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('[AWSConfig] Configuration validation failed: Incomplete credentials');
      console.error('[AWSConfig] AWS_ACCESS_KEY_ID is set but AWS_SECRET_ACCESS_KEY is missing');
      console.error('[AWSConfig] Both credentials must be provided together');
      return false;
    }
    console.log('[AWSConfig] Explicit credentials found in environment variables');
  } else {
    console.log('[AWSConfig] No explicit credentials in environment - will use AWS credential chain');
    console.log('[AWSConfig] Credential chain includes: ~/.aws/credentials, IAM roles, etc.');
  }

  // Configuration is valid
  console.log('[AWSConfig] Configuration validation successful');
  return true;
}

module.exports = {
  getAWSConfig,
  validateConfig
};
