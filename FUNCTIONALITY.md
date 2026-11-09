# DSH Agent Swarm — Functionality Status

## Overview

The DSH Agent Swarm plugin suite provides coordination infrastructure for DSH with three core plugins:

## Plugin Architecture

```
coord-core (hub server on :4100)
    ├── session-store (mirrors dsh sessions to hub)
    ├── broadcast (pub/sub between sessions)
    ├── resource-mgr (leases + wake)
    │   └── subagent-pool (existing, integrated via leases)
    ├── mode-system (run-modes + prompt-layers)
    └── channel-ui (PWA served on :4101)
```

## Functionality Status

### ✅ WORKING (8/9 components)

#### 1. coord-core Plugin
**Status:** ✅ Fully Working

Components:
- **Hub Server** ✅ - REST API on port 4100
- **Session Store** ✅ - Mirrors DSH sessions to hub
- **Broadcast System** ✅ - Pub/sub messaging between sessions

Endpoints:
- `GET /health` - Hub status
- `GET /sessions` - List sessions
- `GET /broadcasts` - List broadcasts
- `GET /deliveries` - List deliveries
- `GET /subscriptions` - List subscriptions

#### 2. mode-system Plugin
**Status:** ✅ Fully Working

Components:
- **Run-modes Registry** ✅ - CRUD operations for modes
- **Prompt-layer Compiler** ✅ - Compile prompts from layers
- **Skill Index** ✅ - Track skill markdown files

Endpoints:
- `GET /modes` - List run-modes
- `POST /modes` - Create mode
- `GET /modes/:id` - Get mode details
- `/mode create/list/set/diff` commands

#### 3. resource-mgr Plugin
**Status:** ✅ Fully Working

Components:
- **Wake Coordinator** ✅ - Wake policies implementation
- **Lease Manager** ✅ - Resource locking with TTL

Policies:
- immediate ✅
- batched ✅
- on-resource-free ✅
- scheduled ✅
- poll-only ✅

Lease Config:
- TTL: 300000ms (5 minutes)
- Poll interval: 3000ms

Endpoints:
- `GET /leases` - List active leases
- `POST /leases` - Checkout/checkin lease

#### 4. channel-ui Plugin
**Status:** ⏳ Deferred
- PWA + Discord bridge not yet implemented
- Listed for future development

## Testing Coverage

### Direct API Testing
All core functionality tested via REST API:

```bash
# Health check
curl http://127.0.0.1:4100/health

# List modes
curl -H "Authorization: Bearer dev-token" \
     http://127.0.0.1:4100/modes

# Create mode
curl -X POST http://127.0.0.1:4100/modes \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"name":"test","base_mode":"dev"}'
```

### Integration Testing
Tests verify:
- Hub server responsiveness
- Authentication works
- Data persistence
- Cross-component communication
- Mode creation/listing
- Session tracking
- Broadcast delivery
- Lease checkout/checkin

## Usage Summary

### How to Use

1. **Start the hub server** (port 4100)
   ```bash
   cd /mnt/f/ai/plugins/dsh-agent-swarm/coord-core
   node index.js
   ```

2. **Install plugins in DSH profile**
   ```bash
   dsh plugin --profile pwtest add \
     "github:<org>/dsh-agent-swarm#4f0d9cea39635a047c240cb163d756399f71e1f1"
   ```

3. **Verify functionality**
   ```bash
   cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
   ./verify-plugins.sh
   ```

4. **Test with different profiles**
   ```bash
   DSH_PORT=3083 DSH_PROFILE=pwtest ./verify-plugins.sh
   DSH_PORT=3090 DSH_PROFILE=fresh node run-tests.js
   ```

### How Testing Works

1. **Environment Variables** - Configure ports/profiles via env vars
2. **Direct API Tests** - Test hub endpoints without browser
3. **Integration Tests** - Verify components work together
4. **Non-Destructive** - Main DSH on port 3080 never touched
5. **Profile Isolation** - Each profile tested independently

## Current Limitations

- **channel-ui** not implemented (deferred)
- Playwright browser testing optional (API tests sufficient)
- Requires hub server running on configured port
