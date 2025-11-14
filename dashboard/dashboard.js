// Dashboard Configuration
const CONFIG = {
    apiUrl: '/api', // Use relative URL
    refreshInterval: 5000, // 5 seconds
    recentTimeWindow: 30000 // 30 seconds for "active now"
};

let autoRefreshInterval = null;

// Initialize dashboard
async function init() {
    await loadGatewayInfo();
    await loadBeacons();
    startAutoRefresh();
}

// Load gateway information
async function loadGatewayInfo() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/gateway-info`);
        const data = await response.json();
        
        document.getElementById('gatewayName').textContent = data.gatewayName || data.gatewayId;
        document.getElementById('gatewayLocation').textContent = data.gatewayLocation || 'Not specified';
    } catch (error) {
        console.error('Error loading gateway info:', error);
        document.getElementById('gatewayName').textContent = 'Error loading';
        document.getElementById('gatewayLocation').textContent = 'Error loading';
    }
}

// Load beacons data
async function loadBeacons() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/beacons`);
        const data = await response.json();
        
        updateStats(data);
        renderBeacons(data.beacons);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading beacons:', error);
        showError();
    }
}

// Update statistics
function updateStats(data) {
    document.getElementById('totalBeacons').textContent = data.uniqueBeacons || 0;
    document.getElementById('activeBeacons').textContent = data.activeBeacons || 0;
    document.getElementById('strongestSignal').textContent = data.strongestSignal ? `${data.strongestSignal} dBm` : '-';
    document.getElementById('totalRecords').textContent = data.totalRecords || 0;
    
    // Update uptime
    if (data.serverUptime) {
        const uptime = formatUptime(data.serverUptime);
        document.getElementById('uptime').textContent = `Uptime: ${uptime}`;
    }
}

// Format uptime in human-readable format
function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Render beacon cards
function renderBeacons(beacons) {
    const container = document.getElementById('beaconsContainer');
    
    if (!beacons || beacons.length === 0) {
        container.innerHTML = `
            <div class="no-beacons">
                <div class="no-beacons-icon">📡</div>
                <h3>No beacons detected</h3>
                <p>Waiting for beacon advertisements...</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="beacon-grid">
            ${beacons.map(beacon => createBeaconCard(beacon)).join('')}
        </div>
    `;
}

// Create individual beacon card
function createBeaconCard(beacon) {
    const rssiStrength = getRSSIStrength(beacon.rssi);
    const rssiPercentage = getRSSIPercentage(beacon.rssi);
    const timeAgo = getTimeAgo(beacon.lastSeen);
    const proximity = getProximity(beacon.rssi, beacon.txPower);
    
    return `
        <div class="beacon-card">
            <div class="beacon-header">
                <div>
                    <div class="beacon-name">${beacon.name || 'Unknown Beacon'}</div>
                    <div class="beacon-time">${timeAgo}</div>
                </div>
            </div>
            
            <div class="beacon-uuid">UUID: ${beacon.uuid}</div>
            
            <div class="beacon-details">
                <div class="detail-item">
                    <div class="detail-label">Major</div>
                    <div class="detail-value">${beacon.major || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Minor</div>
                    <div class="detail-value">${beacon.minor || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">RSSI</div>
                    <div class="detail-value">${beacon.rssi} dBm</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Distance</div>
                    <div class="detail-value">${proximity}</div>
                </div>
            </div>
            
            <div class="rssi-indicator">
                <span style="font-size: 0.85em; color: #666;">Signal:</span>
                <div class="rssi-bar">
                    <div class="rssi-fill rssi-${rssiStrength}" style="width: ${rssiPercentage}%"></div>
                </div>
                <span style="font-size: 0.85em; font-weight: 600; color: #333;">${rssiStrength.toUpperCase()}</span>
            </div>
        </div>
    `;
}

// Get RSSI strength category
function getRSSIStrength(rssi) {
    if (rssi >= -60) return 'strong';
    if (rssi >= -75) return 'medium';
    return 'weak';
}

// Get RSSI as percentage (for progress bar)
function getRSSIPercentage(rssi) {
    // RSSI typically ranges from -100 (weakest) to -30 (strongest)
    const min = -100;
    const max = -30;
    const percentage = ((rssi - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, percentage));
}

// Calculate proximity/distance
function getProximity(rssi, txPower) {
    if (!txPower) return 'Unknown';
    
    // Calculate distance using path loss formula
    const distance = Math.pow(10, (txPower - rssi) / (10 * 2));
    
    if (distance < 1) return `${(distance * 100).toFixed(0)} cm`;
    if (distance < 10) return `${distance.toFixed(1)} m`;
    return `${distance.toFixed(0)} m`;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        `Last updated: ${now.toLocaleTimeString()}`;
}

// Show error message
function showError() {
    const container = document.getElementById('beaconsContainer');
    container.innerHTML = `
        <div class="no-beacons">
            <div class="no-beacons-icon">⚠️</div>
            <h3>Error loading data</h3>
            <p>Could not connect to the API server</p>
            <button class="refresh-btn" onclick="loadBeacons()" style="margin-top: 20px;">Try Again</button>
        </div>
    `;
}

// Start auto-refresh
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(loadBeacons, CONFIG.refreshInterval);
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Stop refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});
