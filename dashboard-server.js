/**
 * Dashboard API Server
 * Provides real-time beacon data to the web dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getAWSConfig } = require('./config/aws-config');

const PORT = 3000;
const RECENT_TIME_WINDOW = 30000; // 30 seconds

// Initialize AWS
const awsConfig = getAWSConfig();
const client = new DynamoDBClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials
});
const docClient = DynamoDBDocumentClient.from(client);

// Track records since server start
let serverStartTime = Date.now();
let totalRecordsSinceStart = 0;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (req.url === '/api/gateway-info') {
    await handleGatewayInfo(req, res);
  } else if (req.url === '/api/beacons') {
    await handleBeacons(req, res);
  } else if (req.url === '/' || req.url === '/index.html') {
    serveFile(res, 'dashboard/index.html');
  } else if (req.url.startsWith('/dashboard/')) {
    serveFile(res, req.url.substring(1));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Serve static files
function serveFile(res, filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Handle gateway info request
async function handleGatewayInfo(req, res) {
  try {
    const info = {
      gatewayId: awsConfig.gatewayId,
      gatewayName: awsConfig.gatewayName || awsConfig.gatewayId,
      gatewayLocation: formatLocation(awsConfig.gatewayLocation),
      region: awsConfig.region,
      tableName: awsConfig.tableName
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
  } catch (error) {
    console.error('Error getting gateway info:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Handle beacons request
async function handleBeacons(req, res) {
  try {
    // Query recent records from this gateway (last 5 minutes for display)
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    const command = new QueryCommand({
      TableName: awsConfig.tableName,
      IndexName: 'GatewayIndex',
      KeyConditionExpression: 'gatewayId = :gid AND #ts > :time',
      ExpressionAttributeNames: {
        '#ts': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':gid': awsConfig.gatewayId,
        ':time': fiveMinutesAgo
      },
      ScanIndexForward: false, // Most recent first
      Limit: 100
    });

    const response = await docClient.send(command);
    const records = response.Items || [];

    // Count records since server start
    const countCommand = new QueryCommand({
      TableName: awsConfig.tableName,
      IndexName: 'GatewayIndex',
      KeyConditionExpression: 'gatewayId = :gid AND #ts > :startTime',
      ExpressionAttributeNames: {
        '#ts': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':gid': awsConfig.gatewayId,
        ':startTime': serverStartTime
      },
      Select: 'COUNT'
    });

    const countResponse = await docClient.send(countCommand);
    totalRecordsSinceStart = countResponse.Count || 0;

    // Process records to get unique beacons with latest data
    const beaconMap = new Map();
    
    records.forEach(record => {
      const key = `${record.uuid}-${record.major}-${record.minor}`;
      
      if (!beaconMap.has(key) || record.timestamp > beaconMap.get(key).timestamp) {
        beaconMap.set(key, {
          uuid: record.uuid,
          major: record.major,
          minor: record.minor,
          rssi: record.rssi,
          txPower: record.txPower,
          name: record.rawData?.localName || null,
          lastSeen: record.timestamp,
          detectedAt: record.detectedAt
        });
      }
    });

    const beacons = Array.from(beaconMap.values())
      .sort((a, b) => b.rssi - a.rssi); // Sort by signal strength

    // Calculate statistics
    const activeBeacons = beacons.filter(b => (now - b.lastSeen) < RECENT_TIME_WINDOW).length;
    const strongestSignal = beacons.length > 0 ? beacons[0].rssi : null;

    const data = {
      beacons,
      uniqueBeacons: beacons.length,
      activeBeacons,
      strongestSignal,
      totalRecords: totalRecordsSinceStart,
      serverUptime: Math.floor((now - serverStartTime) / 1000), // seconds
      timestamp: now
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Error getting beacons:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}

// Format location for display
function formatLocation(location) {
  if (!location) return 'Not specified';
  if (typeof location === 'string') return location;
  if (location.description) return location.description;
  if (location.lat && location.lng) return `${location.lat}, ${location.lng}`;
  return JSON.stringify(location);
}

// Start server
server.listen(PORT, () => {
  console.log('=== Beacon Dashboard Server ===');
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Gateway: ${awsConfig.gatewayName || awsConfig.gatewayId}`);
  console.log(`Location: ${formatLocation(awsConfig.gatewayLocation)}`);
  console.log('');
  console.log('Open http://localhost:3000 in your browser');
  console.log('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down dashboard server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
