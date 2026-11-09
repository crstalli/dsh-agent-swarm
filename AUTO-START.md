# Auto-Start Behavior — DSH Agent Swarm

## How Auto-Start Works

When you start DSH with a profile that includes the coord-core plugin, the hub server **automatically starts** without any manual intervention.

### The Flow

1. **User runs**: `dsh start --profile pwtest`
2. **DSH loads** Cordis configuration from `cordis.patch.yml`
3. **Plugins auto-load**:
   - coord-core/index.js → Starts hub server on port 4100
   - mode-system/index.js → Registers run-modes
   - resource-mgr/index.js → Sets up leases/wake
4. **Hub server ready** immediately
5. **Full API available** at http://127.0.0.1:4100

### Configuration

The hub server port is configurable via environment variables:

```bash
# Default: port 4100
DSH_COORD_HUB_PORT=4100 dsh start --profile pwtest

# Custom port
DSH_COORD_HUB_PORT=4101 dsh start --profile pwtest

# Different profile with different port
DSH_COORD_HUB_PORT=4102 DSH_PORT=3090 dsh start --profile fresh
```

## Verification

Verify auto-start worked:

```bash
# Check hub is running
curl http://127.0.0.1:4100/health

# Should return:
{"status":"ok","port":4100,"sessions":2,"modes":4}
```

## Practical Examples

### 1. Quick Verification
```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
node auto-start-demo.js
```

### 2. Playwright Demo
```bash
node playwright-demo.js
```
Shows full integration with web UI.

### 3. Direct API Test
```bash
# List modes
curl -H "Authorization: Bearer dev-token" \
     http://127.0.0.1:4100/modes

# Create mode
curl -X POST http://127.0.0.1:4100/modes \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"name":"test","base_mode":"dev"}'
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DSH_COORD_HUB_PORT` | 4100 | Hub server port |
| `DSH_COORD_HUB_TOKEN` | dev-token | API auth token |
| `DSH_PORT` | 3080 | DSH web UI port |

## Safety

✅ **Main DSH on port 3080 never touched**
✅ **Auto-start is non-destructive**
✅ **Can test with any profile from scratch**
✅ **Hub server starts/stops with DSH**

## Integration Points

The auto-started hub provides:

- **REST API** for all plugin functionality
- **JSON file store** at `~/.dsh-coord-hub/`
- **Cross-plugin communication** via shared hub
- **Session tracking** integrated with DSH
- **Mode management** accessible via `/mode` commands
