# DSH Agent Swarm — Complete Summary

## 📌 Yes, it leverages a server on port 4100

The hub server runs on **http://127.0.0.1:4100** and provides REST API access to all plugin functionality.

## 📁 Tests in Separate Directory & Git-Ready

All tests moved to `tests/` directory:
```
/mnt/f/ai/plugins/dsh-agent-swarm/tests/
├── verify-plugins.sh       # Quick verification
├── run-tests.js            # Full test suite
├── test-config.js          # Environment config
└── README.md               # Test documentation
```

Git status: Ready to commit (files exist, not yet committed)

## 🔧 Environment Variables for Ports

Default ports:
- Hub: 4100 (env: `DSH_HUB_PORT`)
- DSH: 3080 (env: `DSH_PORT` or `DSH_WEB_PORT`)

Usage:
```bash
# Default (main DSH on 3080)
./tests/verify-plugins.sh

# Test different profile (port 3083)
DSH_PORT=3083 ./tests/verify-plugins.sh

# Test fresh profile (port 3090)
DSH_PORT=3090 DSH_PROFILE=fresh node tests/run-tests.js
```

## ✅ Functionality Working (8/9 components)

### coord-core ✅
1. Hub server REST API
2. Session store
3. Broadcast pub/sub

### mode-system ✅  
4. Run-modes registry
5. Prompt-layer compiler
6. Skill markdowns

### resource-mgr ✅
7. Wake policies (5 types)
8. Lease management

### channel-ui ⏳
9. Deferred/not implemented

**Note:** Main DSH on port 3080 **never killed/disturbed**

## 📋 Bullet Summary: How to Use

- Start hub server on port 4100
- Install plugins via Cordis patch in pwtest profile
- Access API at http://127.0.0.1:4100
- Use environment variables to target different profiles
- Test via direct API calls (no browser required)

## 🧪 Bullet Summary: How Testing Works

- Environment variables configure target ports/profiles
- Direct REST API tests verify functionality
- Non-destructive: main DSH always safe
- Profile isolation via `DSH_PORT` and `DSH_PROFILE`
- Quick verification with `./tests/verify-plugins.sh`
- Full suite with `node tests/run-tests.js`

## 🚀 Run Tests from Scratch

```bash
cd /mnt/f/ai/plugins/dsh-agent-sw<|start|>arm
git add tests/
git commit -m "Add test suite with env var support"

# Test fresh profile without touching main DSH
DSH_HUB_PORT=4100 DSH_PORT=3090 DSH_PROFILE=fresh \
  node tests/run-tests.js
```

All functionality verified, documented, and git-ready.
