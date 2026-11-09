# Usage Guide — DSH Agent Swarm Tests

## Quick Start

### 1. Verify Plugins Are Working
```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
./verify-plugins.sh
```

### 2. Run Full Test Suite
```bash
node run-tests.js
```

### 3. Test Different Profiles

**Main DSH (port 3080) - never disturbed**
```bash
DSH_PORT=3080 DSH_HUB_PORT=4100 node run-tests.js
```

**pwtest profile (port 3083)**
```bash
DSH_PORT=3083 DSH_HUB_PORT=4100 DSH_PROFILE=pwtest node run-tests.js
```

**Fresh profile from scratch (port 3090)**
```bash
DSH_PORT=3090 DSH_HUB_PORT=4101 DSH_PROFILE=fresh node run-tests.js
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DSH_HUB_PORT` | 4100 | Hub server port |
| `DSH_PORT` | 3080 | DSH web UI port |
| `DSH_WEB_PORT` | - | Alternative to DSH_PORT |
| `DSH_PROFILE` | pwtest | Profile name |
| `DSH_HUB_TOKEN` | dev-token | API auth token |

## What Tests Verify

### ✅ Core Functionality (8 components)

1. **Hub Server** - REST API on configured port
2. **Session Store** - Session tracking works
3. **Broadcast System** - Pub/sub messaging
4. **Mode Registry** - Run-modes CRUD
5. **Prompt Compiler** - Layer compilation
6. **Skill Index** - Markdown tracking
7. **Wake Policies** - 5 policy types
8. **Lease Manager** - Resource locking

### 🧪 Testing Methods

**Direct API Testing** (Primary)
- Tests hub endpoints directly via HTTP
- No browser required
- Fast and reliable
- Non-destructive

**Playwright Testing** (Optional)
- Browser automation for UI
- Verifies web interface
- Optional verification layer

## Safety Guarantees

✅ Main DSH on port 3080 never killed
✅ Tests read-only unless creating test data
✅ Profiles isolated via environment variables
✅ Can test fresh profiles from scratch
✅ All tests reversible/non-destructive
