# Discord Integration Testing Plan

## Overview
Comprehensive testing plan for DSH Agent Swarm Discord bridge integration.

## Test Environment Setup

### Prerequisites
```bash
# 1. Install dependencies
cd /mnt/f/ai/plugins/dsh-agent-swarm/channel-ui/discord
npm install

# 2. Set environment variables
export DISCORD_TOKEN="your_bot_token"
export DISCORD_GUILD_ID="your_guild_id"
export DISCORD_CHANNEL_CATEGORY_ID="your_category_id"
export DSH_COORD_HUB_URL="http://127.0.0.1:4100"
export DSH_COORD_HUB_TOKEN="dev-token"

# 3. Start hub server
cd /mnt/f/ai/plugins/dsh-agent-swarm
node coord-core/index.js &

# 4. Start Discord bot
node discord-bot.js
```

### Test Accounts Needed
- Discord bot account (with proper permissions)
- Test Discord server/guild
- Test user accounts for message testing

## Test Cases

### 1. Session ↔ Channel Sync Tests

#### Test 1.1: Auto-create channel on session creation
**Steps:**
1. Create new session via DSH API
2. Wait 5 seconds
3. Verify Discord channel created
**Expected:** New channel appears in Discord with session name
**Screenshot:** Channel list showing new session channel

#### Test 1.2: Auto-delete channel on session archive
**Steps:**
1. Archive existing session
2. Wait 5 seconds
3. Verify Discord channel deleted
**Expected:** Channel removed from Discord
**Screenshot:** Before/after channel list

#### Test 1.3: Session update syncs channel topic
**Steps:**
1. Update session metadata
2. Wait 5 seconds
3. Verify channel topic updated
**Expected:** Channel topic reflects new session info

### 2. Message Flow Tests

#### Test 2.1: Discord → DSH delivery
**Steps:**
1. Send message in Discord session channel
2. Check DSH session deliveries API
**Expected:** Message appears in session deliveries
**Screenshot:** Discord message + API response

#### Test 2.2: DSH → Discord delivery
**Steps:**
1. Post delivery to session via DSH API
2. Wait 5 seconds
3. Verify Discord channel receives message
**Expected:** Agent message appears in Discord channel
**Screenshot:** Discord message from agent

#### Test 2.3: Thread creation for long messages
**Steps:**
1. Post very long message (>1000 chars) to session
2. Wait 5 seconds
3. Verify thread created in Discord
**Expected:** Thread created with full content
**Screenshot:** Thread with detailed reasoning

### 3. Permission and Access Tests

#### Test 3.1: Channel permissions sync
**Steps:**
1. Create session with restricted access
2. Verify Discord channel has correct permissions
**Expected:** Only authorized users can view channel

#### Test 3.2: Message history preservation
**Steps:**
1. Send multiple messages
2. Restart bot
3. Verify mappings preserved
**Expected:** No duplicate channels or lost messages

### 4. Error Handling Tests

#### Test 4.1: Hub server down
**Steps:**
1. Stop hub server
2. Send message in Discord
3. Restart hub
**Expected:** Messages queued and delivered after restart

#### Test 4.2: Discord outage recovery
**Steps:**
1. Disconnect bot from Discord
2. Post to session via API
3. Reconnect bot
**Expected:** Missed messages delivered on reconnect

### 5. Performance Tests

#### Test 5.1: High message volume
**Steps:**
1. Send 100 messages rapidly
2. Measure sync time
**Expected:** All messages synced within 30 seconds

#### Test 5.2: Multiple sessions
**Steps:**
1. Create 50 sessions simultaneously
2. Verify all channels created
**Expected:** All channels created correctly

## Integration Test Scripts

### Automated Test Suite
```javascript
// tests/discord-integration.test.js
const { testDiscordIntegration } = require('./discord-test-runner');

describe('Discord Integration', () => {
  test('session creation creates channel', async () => {
    const session = await createTestSession();
    await waitForSync(5000);
    const channel = await findDiscordChannel(session.id);
    expect(channel).toBeTruthy();
  });
  
  test('message flow Discord to DSH', async () => {
    const message = await postDiscordMessage(testChannel, 'Hello');
    const delivery = await getSessionDelivery(sessionId);
    expect(delivery.content).toContain('Hello');
  });
});
```

## Screenshot Documentation

### Required Screenshots
1. **Dashboard overview** - Discord server showing all session channels
2. **Channel creation** - New channel appearing after session creation
3. **Message sync** - Same message in both Discord and DSH UI
4. **Thread usage** - Thread with detailed reasoning output
5. **Session archive** - Channel removal after session archive
6. **Real-time sync** - Messages appearing instantly in both systems

### Screenshot Locations
All screenshots saved to:
- `/mnt/f/ai/plugins/dsh-agent-swarm/tests/screenshots/`
- Named format: `test-name-timestamp.png`

## Manual Testing Checklist

- [ ] Bot connects to Discord successfully
- [ ] Session channels auto-create
- [ ] Discord messages → DSH deliveries
- [ ] DSH deliveries → Discord messages
- [ ] Long messages use threads
- [ ] Channels delete when sessions archive
- [ ] Permissions work correctly
- [ ] Message history preserved across restarts
- [ ] Error recovery works
- [ ] Rate limits handled gracefully

## Success Criteria

✅ All automated tests pass  
✅ Manual testing checklist complete  
✅ Screenshots captured for all major features  
✅ No message loss in error scenarios  
✅ Sync latency < 5 seconds  
✅ Bot handles 100+ concurrent sessions  

## Test Execution

Run full test suite:
```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/channel-ui/discord
npm test
```

Generate test report:
```bash
npm run test:report
```

View screenshots:
```bash
open tests/screenshots/
```
