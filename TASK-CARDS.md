# Task Cards — Functionality Breakdown

## Original Request Analysis

From the compacted summary, the user requested:
- Build DSH Agent Swarm plugins for pwtest profile
- coord-core (hub server + session-store + broadcast)
- mode-system (run-modes + prompt-layers + skill-markdowns)  
- resource-mgr (wake policies + lease management)

## Component Breakdown

### 1. coord-core Plugin
**Status:** ✅ Working

1.1 **Hub Server** ✅
- REST API server on port 4100
- JSON file store at ./data/
- Health endpoint working

1.2 **Session Store** ✅
- Mirrors DSH sessions to hub
- Tracks session state
- 2 sessions currently tracked

1.3 **Broadcast System** ✅
- Pub/sub messaging
- Deliveries tracked
- Subscriptions managed

### 2. mode-system Plugin
**Status:** ✅ Working

2.1 **Run-modes Registry** ✅
- CRUD operations for modes
- Mode creation/listing works
- Currently 4 modes in system

2.2 **Prompt-layer Compiler** ✅
- compilePrompt() function implemented
- Core + mode + role + playbook layers
- API endpoints working

2.3 **Skill Markdowns** ✅
- Skill index maintained
- Markdown files tracked
- Integration with mode system

### 3. resource-mgr Plugin
**Status:** ✅ Working

3.1 **Wake Policies** ✅
- immediate policy
- batched policy  
- on-resource-free policy
- scheduled policy
- poll-only policy

3.2 **Lease Management** ✅
- Lease TTL: 300000ms
- Poll interval: 3000ms
- Checkout/checkin working
- Resource locking functional

## Summary Count

Total components: **8**
Working: **8**
Deferred: **1** (channel-ui)

The "9" might refer to:
- 3 plugins × 3 components each = 9 total features
- Or counting channel-ui as the 9th deferred item

## Testing Status

All 8 implemented components are working and tested:
- ✅ Direct API tests pass
- ✅ Integration tests pass  
- ✅ Non-destructive testing verified
- ✅ Environment variable support added
- ✅ Git tracking configured
