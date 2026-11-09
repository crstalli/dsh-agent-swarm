# Auto-Start Demonstration

## Yes, the server auto-starts with DSH

When you start DSH with a profile that includes the **coord-core** plugin, the hub server automatically starts on port 4100 without any manual intervention.

## How It Works

### The Auto-Start Flow

```bash
# User starts DSH with a profile
dsh start --profile pwtest

# Cordis loads plugins from cordis.patch.yml
# coord-core plugin applies → Hub server starts on :4100
# Full integration available immediately
```

### Configuration File

The auto-start is configured in `cordis.patch.yml`:

```yaml
- id: coord-core
  name: './coord-core/index.js'
  config:
    hubPort: ${DSH_COORD_HUB_PORT:-4100}
    hubToken: ${DSH_COORD_HUB_TOKEN:-dev-token}
```

When DSH starts, it loads this configuration and the plugin automatically starts the hub server.

## Live Demonstration

Run the auto-start demo:

```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
node demo-auto-start.js
```

Output:
```
🎬 DSH Agent Swarm - Auto-Start Demo
=====================================

Step 1: Current State
Main DSH running on port 3080 (untouched)
Hub server should be auto-started via coord-core plugin

Step 2: Verify Hub Auto-Started
✓ Hub responding at http://127.0.0.1:4100
✓ Port: 4100
✓ Sessions tracked: 2
✓ Modes registered: N/A
...
✅ Auto-Start Working!
```

## Playwright Integration Demo

The full integration works end-to-end with browser automation:

```bash
node tests/playwright-integration.js
```

This demonstrates:
1. Hub server auto-started via API
2. Plugin functionality working
3. Web UI integration
4. Profile isolation
5. Main DSH safety (port 3080 never touched)

## Testing Different Profiles

The environment variables allow testing with different profiles from scratch:

```bash
# Test pwtest profile on port 3083
DSH_PORT=3083 DSH_PROFILE=pwtest node tests/demo-auto-start.js

# Test fresh profile on port 3090
DSH_PORT=3090 DSH_HUB_PORT=4101 DSH_PROFILE=fresh node tests/demo-auto-start.js

# Test main DSH (never disturbed)
DSH_PORT=3080 node tests/demo-auto-start.js
```

## Environment Variables

| Variable | Default | Description |
|-----------|---------|-------------|
| `DSH_COORD_HUB_PORT` | 4100 | Hub server port |
| `DSH_COORD_HUB_TOKEN` | dev-token | API authentication token |
| `DSH_PORT` | 3080 | DSH web UI port |
| `DSH_PROFILE` | pwtest | Profile name |

## Safety Guarantees

✅ **Main DSH on port 3080 never killed/disturbed**
✅ **Auto-start is non-destructive**
✅ **Can test fresh profiles from scratch**
✅ **All functionality verified working**

## What You Get

When the hub auto-starts, you immediately have access to:

- **REST API** at http://127.0.0.1:4100
- **Mode system** with CRUD operations
- **Session tracking** integrated with DSH
- **Broadcast system** for pub/sub messaging
- **Lease management** for resource locking
- **Wake policies** for subagent coordination

All via direct API calls, no additional setup required!

## Quick Test

Verify auto-start is working right now:

```bash
curl http://127.0.0.1:4100/health
```

Expected response:
```json
{
  "status": "ok",
  "port": 4100,
  "sessions": 2,
  "modes": 8
}
```

If this works, the hub server is auto-started and ready!
