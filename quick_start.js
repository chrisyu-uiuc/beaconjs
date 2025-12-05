const BeaconScanner = require('node-beacon-scanner');
const { getAWSConfig, validateConfig } = require('./config/aws-config');
const BeaconStorage = require('./services/beacon-storage');

// Initialize beacon scanner
const scanner = new BeaconScanner();

// Global reference to storage service
let beaconStorage = null;

/**
 * Initialize the application
 */
async function initialize() {
  try {
    console.log('=== Beacon Scanner with AWS Storage ===');
    console.log('[Application] Starting initialization...');
    
    // Load and validate AWS configuration
    console.log('[Application] Loading AWS configuration...');
    const awsConfig = getAWSConfig();
    
    if (!validateConfig()) {
      console.error('[Application] AWS configuration validation failed');
      console.error('[Application] Please check your environment variables and try again');
      process.exit(1);
    }
    
    console.log('[Application] AWS Configuration Summary:');
    console.log(`[Application]   Region: ${awsConfig.region}`);
    console.log(`[Application]   DynamoDB Table: ${awsConfig.tableName}`);
    console.log(`[Application]   Credentials: ${awsConfig.credentials ? 'Explicit (from env)' : 'Default chain'}`);
    
    // Initialize BeaconStorage instance
    console.log('[Application] Initializing BeaconStorage service...');
    beaconStorage = new BeaconStorage(awsConfig);
    await beaconStorage.initialize();
    
    console.log('[Application] BeaconStorage initialized successfully');
    
    // Set up advertisement handler
    scanner.onadvertisement = (ad) => {
      // Keep existing console.log for debugging
      console.log(JSON.stringify(ad, null, '  '));
      
      // Store beacon record (fire-and-forget to avoid blocking scanner)
      // Don't await - let it run in background
      beaconStorage.storeBeaconRecord(ad).catch(error => {
        // Log error details without interrupting beacon detection
        console.error('[Application] AWS Storage Error - Beacon scanning continues');
        console.error(`[Application] Error Type: ${error.constructor.name}`);
        console.error(`[Application] Error Code: ${error.code || error.name || 'Unknown'}`);
        console.error(`[Application] Error Message: ${error.message}`);
        if (error.stack) {
          console.error('[Application] Stack trace:', error.stack);
        }
      });
    };
    
    // Start scanning with optimized parameters
    console.log('[Application] Starting beacon scanner...');
    // Use faster scan parameters: scan more frequently with shorter intervals
    await scanner.startScan({
      // Scan interval: how often to scan (in milliseconds)
      // Lower = more frequent scanning = faster detection
      interval: 100,  // Default is often 1000ms, we use 100ms for faster scanning
      // Scan window: how long each scan lasts (in milliseconds)
      // Higher = more time listening = better detection
      window: 100     // Match interval for continuous scanning
    });
    console.log('[Application] Beacon scanner started successfully');
    console.log('[Application] Listening for beacon advertisements...');
    
  } catch (error) {
    console.error('[Application] Initialization failed');
    console.error(`[Application] Error Type: ${error.constructor.name}`);
    console.error(`[Application] Error Message: ${error.message}`);
    if (error.stack) {
      console.error('[Application] Stack trace:', error.stack);
    }
    console.error('[Application] Exiting with error code 1');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  console.log(`\n[Application] Received ${signal} signal`);
  console.log('[Application] Initiating graceful shutdown...');
  
  try {
    // Flush any buffered records
    if (beaconStorage) {
      const bufferSize = beaconStorage.getBufferSize();
      if (bufferSize > 0) {
        console.log(`[Application] Flushing ${bufferSize} buffered record(s) before shutdown...`);
        try {
          const flushResult = await beaconStorage.flushBuffer();
          console.log(`[Application] Buffer flush completed - Success: ${flushResult.success}, Failed: ${flushResult.failed}`);
        } catch (flushError) {
          // Log flush errors but continue shutdown
          console.error('[Application] Error flushing buffer during shutdown');
          console.error(`[Application] Error Type: ${flushError.constructor.name}`);
          console.error(`[Application] Error Code: ${flushError.code || flushError.name || 'Unknown'}`);
          console.error(`[Application] Error Message: ${flushError.message}`);
          if (flushError.stack) {
            console.error('[Application] Stack trace:', flushError.stack);
          }
        }
      } else {
        console.log('[Application] No buffered records to flush');
      }
    }
    
    // Stop beacon scanner
    if (scanner) {
      console.log('[Application] Stopping beacon scanner...');
      await scanner.stopScan();
      console.log('[Application] Beacon scanner stopped successfully');
    }
    
    console.log('[Application] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Application] Error during shutdown');
    console.error(`[Application] Error Type: ${error.constructor.name}`);
    console.error(`[Application] Error Code: ${error.code || error.name || 'Unknown'}`);
    console.error(`[Application] Error Message: ${error.message}`);
    if (error.stack) {
      console.error('[Application] Stack trace:', error.stack);
    }
    console.error('[Application] Exiting with error code 1');
    process.exit(1);
  }
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the application
initialize();
