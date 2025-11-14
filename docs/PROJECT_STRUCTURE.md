# Project Structure

## Directory Layout

```
beaconjs/
├── config/                      # Configuration modules
│   └── aws-config.js           # AWS configuration loader
│
├── services/                    # Core services
│   └── beacon-storage.js       # DynamoDB storage service
│
├── dashboard/                   # Web dashboard
│   ├── index.html              # Dashboard UI
│   ├── dashboard.js            # Frontend logic
│   └── test.html               # API testing page
│
├── scripts/                     # Deployment & utility scripts
│   ├── deploy-to-pi.sh         # Deploy to Raspberry Pi
│   ├── pi-setup.sh             # Setup on Raspberry Pi
│   ├── start-dashboard.sh      # Start dashboard server
│   └── clear-records.py        # Clear DynamoDB records
│
├── docs/                        # Documentation
│   ├── AWS_SETUP_GUIDE.md
│   ├── DASHBOARD_QUICK_START.md
│   ├── DASHBOARD_README.md
│   ├── DASHBOARD_TROUBLESHOOTING.md
│   ├── GATEWAY_SETUP_GUIDE.md
│   ├── MULTI_GATEWAY_SUMMARY.md
│   ├── PROJECT_STRUCTURE.md    # This file
│   ├── QUICK_START_PI.md
│   └── RASPBERRY_PI_INSTALL.md
│
├── quick_start.js               # Main beacon scanner application
├── dashboard-server.js          # Dashboard API server
├── package.json                 # Node.js dependencies
├── .env.example                 # Configuration template
├── .gitignore                   # Git exclusions
├── README.md                    # Main documentation
└── GETTING_STARTED.md          # Quick start guide
```

## File Descriptions

### Core Application Files

| File | Size | Description |
|------|------|-------------|
| `quick_start.js` | ~5 KB | Main beacon scanner application |
| `config/aws-config.js` | ~3 KB | AWS configuration and validation |
| `services/beacon-storage.js` | ~15 KB | DynamoDB storage with retry logic |
| `package.json` | ~1 KB | Node.js dependencies |
| `.env.example` | ~1 KB | Configuration template |

**Total Core: ~25 KB**

### Dashboard Files

| File | Size | Description |
|------|------|-------------|
| `dashboard-server.js` | ~6 KB | API server for dashboard |
| `dashboard/index.html` | ~12 KB | Web interface |
| `dashboard/dashboard.js` | ~8 KB | Frontend JavaScript |
| `dashboard/test.html` | ~4 KB | API testing page |

**Total Dashboard: ~30 KB**

### Scripts

| File | Size | Description |
|------|------|-------------|
| `scripts/deploy-to-pi.sh` | ~1 KB | Deploy to Raspberry Pi |
| `scripts/pi-setup.sh` | ~3 KB | Interactive setup script |
| `scripts/start-dashboard.sh` | ~1 KB | Start dashboard server |
| `scripts/clear-records.py` | ~2 KB | Clear DynamoDB records |

**Total Scripts: ~7 KB**

### Documentation

| File | Description |
|------|-------------|
| `README.md` | Main project documentation |
| `GETTING_STARTED.md` | Quick start guide |
| `docs/AWS_SETUP_GUIDE.md` | AWS DynamoDB setup |
| `docs/GATEWAY_SETUP_GUIDE.md` | Multi-gateway deployment |
| `docs/RASPBERRY_PI_INSTALL.md` | Raspberry Pi installation |
| `docs/QUICK_START_PI.md` | Quick reference for Pi |
| `docs/DASHBOARD_QUICK_START.md` | Dashboard quick start |
| `docs/DASHBOARD_README.md` | Full dashboard docs |
| `docs/DASHBOARD_TROUBLESHOOTING.md` | Troubleshooting guide |
| `docs/MULTI_GATEWAY_SUMMARY.md` | Multi-gateway implementation |
| `docs/PROJECT_STRUCTURE.md` | This file |

**Total Docs: ~60 KB**

## Files to Deploy

### Minimal Deployment (Beacon Scanner Only)

```
beaconjs/
├── config/
│   └── aws-config.js
├── services/
│   └── beacon-storage.js
├── quick_start.js
├── package.json
└── .env.example
```

**Size: ~25 KB (+ ~50 MB node_modules after npm install)**

### Full Deployment (With Dashboard)

Add these files:
```
├── dashboard/
│   ├── index.html
│   ├── dashboard.js
│   └── test.html
├── dashboard-server.js
└── scripts/
    ├── start-dashboard.sh
    └── clear-records.py
```

**Total Size: ~62 KB (+ ~50 MB node_modules)**

## Generated Files (Not in Git)

```
node_modules/          # npm packages (~50 MB)
.env                   # Your configuration (DO NOT commit!)
package-lock.json      # npm lock file
*.log                  # Log files
```

## Usage Examples

### Deploy to Raspberry Pi
```bash
./scripts/deploy-to-pi.sh pi@raspberrypi.local
```

### Start Services
```bash
# Beacon scanner
node quick_start.js

# Dashboard
./scripts/start-dashboard.sh
```

### Utilities
```bash
# Clear records
python3 scripts/clear-records.py

# Setup on Pi
./scripts/pi-setup.sh
```

## What to Commit to Git

✅ **Include:**
- All `.js` files
- All `.md` files
- `.env.example`
- `.sh` and `.py` scripts
- `dashboard/` folder
- `config/` folder
- `services/` folder
- `docs/` folder
- `scripts/` folder
- `package.json`
- `.gitignore`

❌ **Exclude (.gitignore):**
- `node_modules/`
- `.env` (contains secrets!)
- `*.log`
- `.DS_Store`
- `package-lock.json` (optional)

## Directory Purposes

### `/config`
Configuration modules for AWS, credentials, and environment settings.

### `/services`
Core business logic services (storage, processing, etc.).

### `/dashboard`
Web dashboard frontend files (HTML, CSS, JavaScript).

### `/scripts`
Deployment, setup, and utility scripts.

### `/docs`
All documentation files organized in one place.

## File Sizes Summary

| Category | Files | Size |
|----------|-------|------|
| Core Application | 5 | ~25 KB |
| Dashboard | 4 | ~30 KB |
| Scripts | 4 | ~7 KB |
| Documentation | 11 | ~60 KB |
| **Total** | **24** | **~122 KB** |

After `npm install`: **~50 MB** (includes node_modules)

## Quick Navigation

- **Getting Started**: `GETTING_STARTED.md`
- **Main Docs**: `README.md`
- **Setup Guides**: `docs/`
- **Scripts**: `scripts/`
- **Dashboard**: `dashboard/`
- **Core Code**: `config/`, `services/`, `quick_start.js`
