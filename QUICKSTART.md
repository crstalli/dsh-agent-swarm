# DSH Agent Swarm — Quick Start

## ⚡ Bullet Summary: How to Use

### Setup
- **Hub Server** runs on port 4100 (configurable via `DSH_HUB_PORT`)
- **Main DSH** runs on port 3080 (never killed/disturbed)
- **Test Profile** runs on port 3083 (pwtest)

### Usage
- Install plugins via Cordis patch
- Hub provides REST API for all functionality
- Test with environment variables to target different profiles
- Direct API testing works without browser automation

### Testing
- Run `./tests/verify-plugins.sh` for quick check
- Run `node tests/run-tests.js` for full suite
- Use `DSH_PORT` env var to test different profiles
- Main DSH always safe on port 3080

## 📋 Bullet Summary: Functionality Working

### coord-core ✅
- Hub server REST API on :4100
- Session store mirrors DSH sessions
- Broadcast pub/sub system
- Delivery tracking

### mode-system ✅
- Run-modes registry CRUD
- Prompt-layer compilation
- Skill markdown indexing
- `/mode` commands (create/list/set/diff)

### resource-mgr ✅
- Wake coordinator (5 policies)
- Lease management with TTL
- Resource locking
- Poll intervals configured

### channel-ui ⏳
- Deferred/not implemented yet
