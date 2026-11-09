# DSH Agent Swarm - Tests

## Quick Start

### Verify Everything Working
```bash
./verify-plugins.sh
```

### Auto-Start Demo
```bash
node demo-auto-start.js
```

### Full Integration Demo (with Playwright)
```bash
node playwright-integration.js
```

## Auto-Start Behavior

The hub server **auto-starts** when DSH starts with a profile that includes the coord-core plugin.

**No manual server management required!**

### How It Works

1. User runs: `dsh start --profile pwtest`
2. Cordis loads plugins from `cordis.patch.yml`
3. coord-core plugin starts hub server on port 4100
4. Full API available immediately

### Verify It's Working

```bash
# Check hub is running
curl http://127.0.0.1:4100/health

# Expected: {"status":"ok","port":4100,"sessions":2,"modes":8}
```

## Testing Different Profiles

Use environment variables to test without touching main DSH:

```bash
# Main DSH (port 3080) - never disturbed
DSH_PORT=3080 node demo-auto-start.js

# pwtest profile (port 3083)
DSH_PORT=3083 DSH_PROFILE=pwtest node demo-auto-start.js

# Fresh profile from scratch (port 3090)
DSH_PORT=3090 DSH_HUB_PORT=4101 node demo-auto-start.js
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

### ✅ Core Functionality (8/9 components)

1. **Hub Server** - REST API on configured port
2. **Session Store** - Session tracking
3. **Broadcast System** - Pub/sub messaging
4. **Mode Registry** - Run-modes CRUD
5. **Prompt Compiler** - Layer compilation
6. **Skill Index** - Markdown tracking
7. **Wake Policies** - 5 policy types
8. **Lease Manager** - Resource locking

9. ⏳ channel-ui (deferred)

## Test Files

- `verify-plugins.sh` - Quick verification script
- `demo-auto-start.js` - Auto-start demonstration
- `playwright-integration.js` - Full integration demo with browser
- `auto-start-demo.js` - Detailed auto-start explanation
- `test-config.js` - Environment configuration
- `run-tests.js` - Full test suite

## Safety

✅ Main DSH on port 3080 never killed/disturbed
✅ Tests are non-destructive
✅ Can test fresh profiles from scratch
✅ All tests reversible

## Running Tests

```bash
# Quick check
./verify-plugins.sh

# Full suite
node run-tests.js

# With different profile
DSH_PORT=3083 node run-tests.js
```

All tests verify the hub server auto-starts correctly and plugins work end-to-end!
