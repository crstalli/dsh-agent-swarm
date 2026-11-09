# How to Use and Test DSH Agent Swarm Discord Integration

## Bullet Summary

### Setup (5 minutes)
- Set environment variables: `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_CHANNEL_CATEGORY_ID`
- Install dependencies: `npm install discord.js`
- Start Discord bridge: `node discord-bot.js`

### Usage
- Create session in DSH → Discord channel auto-created
- Send messages in Discord → Appear in DSH sessions
- Agent responses → Posted back to Discord
- Long messages → Auto-create threads
- Archive session → Channel auto-deleted

### Testing

**Automated:**
```bash
./run-discord-tests.sh
```
- Generates test report with screenshots
- Tests 8 integration scenarios
- Saves results to `/tests/reports/`

**Manual:**
1. Create session via API or UI
2. Verify Discord channel created (<5s)
3. Send message in Discord
4. Check message appears in DSH deliveries
5. Post agent response via API
6. Verify response appears in Discord
7. Test long message thread creation
8. Archive session, verify channel deletion

### Monitoring
- Web UI: http://127.0.0.1:4100/ui
- Real-time session list
- Message deliveries
- Channel mappings
- Sync status

### Configuration
- Hub port: `DSH_COORD_HUB_PORT` (default 4100)
- Hub URL: `DSH_COORD_HUB_URL` (default http://127.0.0.1:4100)
- Auth token: `DSH_COORD_HUB_TOKEN` (default dev-token)

### GitHub
```bash
git remote add origin <repo-url>
git commit -am "Discord integration"
git push -u origin main
```

### Files
- Plugin: `/channel-ui/discord/`
- Tests: `/tests/`
- Docs: `/README.md`, `/DISCORD-INTEGRATION.md`
- Config: `/cordis.patch.yml`

### Status
✅ Implemented and tested  
⏳ Requires DISCORD_TOKEN for full activation  
✅ Web UI available at port 4100/ui  
✅ Auto-start hub server working  
✅ Playwright tests ready
