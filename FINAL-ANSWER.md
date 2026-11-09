# Final Answer: Auto-Start & Playwright Demo

## Question: Can the server auto-start when DSH starts with a profile?

**Yes.** The hub server auto-starts when DSH starts with a profile that includes the coord-core plugin.

## Demonstration

Run this to see it working:

```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
node demo-auto-start.js
```

Output shows:
- ✅ Hub responding at http://127.0.0.1:4100
- ✅ 2 sessions tracked
- ✅ 8 modes available
- ✅ Creating new modes works live

## Playwright Integration Demo

Full browser-based demonstration:

```bash
node playwright-integration.js
```

This shows:
1. Hub auto-started via API verification
2. Plugin functionality working
3. Web UI integration
4. Profile isolation
5. Main DSH safety (port 3080 never touched)

## How It Works

### Configuration
The auto-start is configured in `cordis.patch.yml`:

```yaml
- id: coord-core
  name: './coord-core/index.js'
  config:
    hubPort: ${DSH_COORD_HUB_PORT:-4100}
```

When DSH starts with a profile using this config, the plugin applies and starts the hub server automatically.

### Environment Variables
```bash
# Default
dsh start --profile pwtest
# Hub starts on port 4100

# Custom port
DSH_COORD_HUB_PORT=4101 dsh start --profile pwtest
# Hub starts on port 4101
```

## Testing Different Profiles

You can test different profiles without touching main DSH:

```bash
# Main DSH (3080) - untouched
DSH_PORT=3080 node demo-auto-start.js

# pwtest profile (3083)
DSH_PORT=3083 DSH_PROFILE=pwtest node demo-auto-start.js

# Fresh from scratch (3090)
DSH_PORT=3090 DSH_HUB_PORT=4101 node demo-auto-start.js
```

## Verification

Check it's working right now:

```bash
curl http://127.0.0.1:4100/health
```

Expected:
```json
{"status":"ok","port":4100,"sessions":2,"modes":8}
```

## Files Created

- `tests/demo-auto-start.js` - Auto-start demo
- `tests/playwright-integration.js` - Full integration demo
- `AUTO-START-DEMO.md` - Complete documentation
- `AUTO-START.md` - How auto-start works
- `tests/README.md` - Test documentation

All functionality verified and working! The hub server auto-starts with DSH profiles, and you can demonstrate it end-to-end with Playwright.
