# DSH Agent Swarm Discord Integration - Test Summary

## Overview

This document provides a complete testing guide for the Discord integration with screenshots and step-by-step instructions.

## Test Environment

### Prerequisites
- Hub server running on port 4100
- Discord bot configured with valid token
- DSH Agent Swarm plugins installed
- pwtest profile on port 3083+

### Configuration
```bash
export DISCORD_TOKEN="your_bot_token"
export DISCORD_GUILD_ID="your_guild_id"
export DISCORD_CHANNEL_CATEGORY_ID="your_category_id"
export DSH_COORD_HUB_URL="http://127.0.0.1:4100"
export DSH_COORD_HUB_TOKEN="dev-token"
```

## Test Suite

### Test 1: Session Creation → Channel Creation

**Objective:** Verify new sessions automatically create Discord channels

**Steps:**
1. Create session via DSH API
2. Wait 5 seconds for sync
3. Verify Discord channel exists

**Expected Result:**
- ✅ Channel created in Discord server
- ✅ Channel name matches session name
- ✅ Channel topic shows session ID

**Screenshot:** `session-channel-created.png`

**API Call:**
```bash
curl -X POST http://127.0.0.1:4100/api/sessions \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Session", "projectId": "test"}'
```

### Test 2: Discord → DSH Message Flow

**Objective:** Verify messages sent in Discord reach DSH sessions

**Steps:**
1. Send message in Discord session channel
2. Check DSH deliveries API
3. Verify message appears in deliveries

**Expected Result:**
- ✅ Message appears in session deliveries
- ✅ User field shows Discord user ID
- ✅ Content matches original message

**Screenshot:** `discord-to-dsh-message.png`

### Test 3: DSH → Discord Message Flow

**Objective:** Verify agent responses appear in Discord

**Steps:**
1. Post delivery to session via API
2. Wait for sync (3 seconds)
3. Verify Discord channel receives message

**Expected Result:**
- ✅ Message appears in Discord channel
- ✅ Agent avatar shown
- ✅ Timestamp accurate

**API Call:**
```bash
curl -X POST http://127.0.0.1:4100/api/sessions/<id>/deliveries \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"user": "agent", "content": "Test response", "type": "response"}'
```

### Test 4: Long Messages → Threads

**Objective:** Verify long messages use Discord threads

**Steps:**
1. Post message >1000 chars to session
2. Wait for sync
3. Verify thread created in Discord

**Expected Result:**
- ✅ Short summary in main channel
- ✅ Full content in thread
- ✅ Thread named "Detailed Output"

**Screenshot:** `long-message-thread.png`

### Test 5: Session Archive → Channel Deletion

**Objective:** Verify archiving session deletes Discord channel

**Steps:**
1. Create test session
2. Archive session via API
3. Verify Discord channel deleted

**Expected Result:**
- ✅ Channel removed from Discord
- ✅ No orphan channels remain

**API Call:**
```bash
curl -X POST http://127.0.0.1:4100/api/sessions/<id>/archive \
  -H "Authorization: Bearer dev-token"
```

### Test 6: Permission Sync

**Objective:** Verify channel permissions reflect session access

**Steps:**
1. Create session with restricted access
2. Check Discord channel permissions
3. Verify only authorized users can view

**Expected Result:**
- ✅ Channel permissions match session data
- ✅ Unauthorized users cannot view channel

### Test 7: Message History Preservation

**Objective:** Verify message history survives bot restart

**Steps:**
1. Send multiple messages
2. Restart Discord bot
3. Verify mappings preserved

**Expected Result:**
- ✅ No duplicate channels created
- ✅ Existing messages still accessible
- ✅ New messages sync correctly

### Test 8: Error Recovery

**Objective:** Verify system recovers from outages

**Steps:**
1. Stop hub server
2. Send messages in Discord
3. Restart hub server
4. Verify queued messages delivered

**Expected Result:**
- ✅ Messages queued during outage
- ✅ Messages delivered after restart
- ✅ No data loss

## Screenshots

All test screenshots saved to `/mnt/f/ai/plugins/dsh-agent-swarm/tests/screenshots/`

### Required Screenshots

1. **hub-dashboard.png**
   - Hub server UI showing all sessions
   - Shows sessions list and status

2. **session-created.png**
   - New session visible in UI
   - Session details displayed

3. **discord-server-channels.png**
   - Discord server with session channels
   - Channels organized in category

4. **message-delivered.png**
   - Message in session deliveries API
   - Shows user, content, timestamp

5. **long-message-thread.png**
   - Main channel with summary
   - Thread with full details

6. **session-archived.png**
   - Session removed from UI
   - Channel removed from Discord

## Automated Test Execution

### Run Full Test Suite

```bash
cd /mnt/f/ai/plugins/dsh-agent-swarm/tests
./run-discord-tests.sh
```

### Expected Output

```
🚀 DSH Agent Swarm Discord Integration Tests
==============================================

Test 1: Hub server health check ✅ PASS
Test 2: Session API accessibility ✅ PASS
Test 3: Create test session ✅ PASS
Test 4: Message delivery ✅ PASS
Test 5: Web UI accessibility ✅ PASS

📊 Summary:
   - Hub server: ✅ Running
   - Session API: ✅ Accessible
   - Web UI: ✅ Accessible
   - Discord bot: ⚠️ Simulation mode (set DISCORD_TOKEN)
```

## Manual Testing Checklist

- [ ] Bot connects to Discord successfully
- [ ] New session creates channel automatically (<5s)
- [ ] Discord messages reach DSH sessions
- [ ] DSH deliveries appear in Discord
- [ ] Long messages create threads
- [ ] Channels delete when sessions archive
- [ ] Channel permissions sync correctly
- [ ] Message history preserved across restarts
- [ ] Error recovery works (hub down → up)
- [ ] Rate limits handled gracefully
- [ ] Multiple sessions handled concurrently
- [ ] UI shows correct sync status

## Performance Benchmarks

### Latency
- Session creation → Channel creation: < 5s
- Message sync (Discord → DSH): < 3s
- Message sync (DSH → Discord): < 3s
- Channel deletion: < 5s

### Throughput
- Messages per minute: 100+
- Concurrent sessions: 50+
- Channels created per batch: 10

### Reliability
- Message delivery success rate: >99%
- Uptime: >99.9%
- Data loss: 0%

## Troubleshooting

### Common Issues

**Bot not connecting**
- Check `DISCORD_TOKEN` is valid
- Verify bot has required permissions
- Ensure `DISCORD_GUILD_ID` is correct

**Channels not creating**
- Verify `DISCORD_CHANNEL_CATEGORY_ID` exists
- Check bot has `MANAGE_CHANNELS` permission
- Ensure category is in correct guild

**Messages not syncing**
- Verify hub server running on port 4100
- Check `DSH_COORD_HUB_TOKEN` matches
- Verify network connectivity

**Rate limits**
- Default: 3 second sync interval
- Max: 100 messages/minute
- Adjust in configuration if needed

## Test Results Template

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "tests": [
    {
      "name": "Session creates channel",
      "passed": true,
      "duration_ms": 4500,
      "screenshots": ["session-channel-created.png"]
    },
    {
      "name": "Message flow Discord to DSH",
      "passed": true,
      "duration_ms": 3200,
      "screenshots": ["discord-to-dsh-message.png"]
    }
  ],
  "summary": {
    "total": 8,
    "passed": 8,
    "failed": 0,
    "success_rate": "100%"
  }
}
```

## Next Steps

1. ✅ Set `DISCORD_TOKEN` environment variable
2. ✅ Configure `DISCORD_GUILD_ID` and `DISCORD_CHANNEL_CATEGORY_ID`
3. ⏳ Run full integration tests with screenshots
4. ⏳ Verify all test cases pass
5. ⏳ Document edge cases
6. ⏳ Performance testing
7. ⏳ Load testing with 100+ sessions

## Support

For issues or questions:
- Check logs: `/mnt/f/ai/plugins/dsh-agent-swarm/channel-ui/discord/logs/`
- Review configuration: `cordis.patch.yml`
- Run tests: `./run-discord-tests.sh`
- Verify setup: Ensure all environment variables set
