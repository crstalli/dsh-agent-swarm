# DSH Agent Swarm - Web UI Access Guide

## Overview

The DSH Agent Swarm plugins include a web-based monitoring and control UI accessible at **http://127.0.0.1:4100/ui**

## Accessing the UI

### Prerequisites
1. Hub server must be running (starts automatically with DSH when profile uses coord-core plugin)
2. Port 4100 must be available (or configure via `DSH_COORD_HUB_PORT` env var)

### Starting DSH with UI Support

```bash
# Start pwtest profile with hub on port 4100
DSH_COORD_HUB_PORT=4100 \
DSH_COORD_HUB_TOKEN=dev-token \
dsh --profile pwtest --port 3083 --no-open

# Or use a different port
DSH_COORD_HUB_PORT=4110 \
dsh --profile pwtest --port 3083 --no-open
```

Then access:
- **UI**: http://127.0.0.1:4100/ui (or your configured port)
- **API**: http://127.0.0.1:4100/health

## UI Features

### Dashboard (`/ui`)
- System overview with counts of sessions, modes, broadcasts, leases
- Quick links to all sections
- API endpoint reference

### Modes (`/ui/modes`)
- View all run modes
- Create new modes via web form
- Mode details including base mode and description

### Sessions (`/ui/sessions`)
- View active sessions
- Session status and last activity timestamps

### Broadcasts (`/ui/broadcasts`)
- View broadcast messages
- Track delivery status

### Leases (`/ui/leases`)
- View resource leases
- Lease holders and expiration times

### Subscriptions (`/ui/subscriptions`)
- View active subscriptions
- Wake policies and subscriber info

## Using the UI

### Creating a Mode via UI
1. Navigate to http://127.0.0.1:4100/ui/modes
2. Fill in mode name and select base mode
3. Click "Create Mode"
4. Results appear in the preview area

### Monitoring System Activity
The dashboard updates in real-time as you:
- Create modes
- Start sessions
- Send broadcasts
- Acquire/release leases

## API Access

All UI actions are proxied to the REST API:

```bash
# Health check
curl http://127.0.0.1:4100/health

# List modes (requires auth)
curl -H "Authorization: Bearer dev-token" \
  http://127.0.0.1:4100/modes

# Create mode
curl -X POST http://127.0.0.1:4100/modes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-mode","base_mode":"dev"}'
```

## Configuration

### Environment Variables
- `DSH_COORD_HUB_PORT` - Hub server port (default: 4100)
- `DSH_COORD_HUB_TOKEN` - API auth token (default: dev-token)

### Profile Configuration
The UI is enabled by default when coord-core plugin is active in a profile:

```yaml
# cordis.patch.yml
- id: dsh-agent-swarm-coord-core
  name: 'dsh-agent-swarm-coord-core'
```

## Troubleshooting

### UI Not Loading
1. Verify hub is running: `curl http://127.0.0.1:4100/health`
2. Check DSH profile is using coord-core plugin
3. Verify port is not in use: `lsof -i :4100`

### Port Conflicts
If port 4100 is busy, configure a different port:
```bash
DSH_COORD_HUB_PORT=4110 dsh --profile pwtest --port 3083
```

### Authentication Errors
The UI requires authentication for write operations. Use token: `dev-token` (or your configured token)

## Development

The UI is built directly into the coord-core plugin's HTTP server. The rendering function is in:
- `/mnt/f/ai/plugins/dsh-agent-swarm/coord-core/index.js` (renderUI function)

To customize the UI, modify the renderUI function and restart DSH.
