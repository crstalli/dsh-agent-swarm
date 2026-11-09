# DSH Agent Swarm - Channel UI

Channel UI provides Discord-like interfaces for interacting with DSH sessions.

## Components

### PWA (Web App)
Mobile-first web app served by hub server
- Server = Project
- Channel = Session  
- Thread = Sub-session/task

### Discord Bridge
Optional Discord bot that mirrors DSH sessions to Discord channels

## Architecture

```
DSH Hub Server (Port 4100)
    │
    ├── API Endpoints (/api/sessions, /api/broadcasts, etc.)
    │
    ├── Web UI (/ui)
    │
    └── Discord Bridge (discord-bot.js)
            │
            └── Discord API
                    │
                    ├── Channels ↔ Sessions
                    ├── Messages ↔ Deliveries
                    └── Threads ↔ Reasoning/Details
```

## Mapping

- **Server** = Project in DSH
- **Channel** = Session (one-to-one mapping)
- **Thread** = Sub-session or detailed output
- **Messages** = Deliveries to sessions
- **System messages** = Broadcast summaries

## Setup

See `discord/` subdirectory for Discord bridge setup.
