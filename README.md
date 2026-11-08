# DSH Agent Swarm — Plugin Registry

This directory contains all DSH Cordis plugins for the agent-swarm ecosystem.

## Plugins

| Plugin | Status | Description |
|--------|--------|-------------|
| [coord-core](coord-core/) | 🆕 New | Coordination hub server + session-store + broadcast tools |
| [mode-system](mode-system/) | 🆕 New | Run-modes registry + prompt-layer compilation + skill index |
| [resource-mgr](resource-mgr/) | 🆕 New | Wake coordinator + lease management (integrates subagent-pool) |
| [channel-ui](channel-ui/) | 🆕 New | PWA + optional Discord bridge (Discord-like UI) |

## Plugin Architecture

```
coord-core (hub server on :4100)
    ├── session-store (mirrors dsh sessions to hub)
    ├── broadcast (pub/sub between sessions)
    ├── resource-mgr (leases + wake)
    │   └── subagent-pool (existing, integrated via leases)
    ├── mode-system (run-modes + prompt-layers)
    └── channel-ui (PWA served on :4101)
```

## MVP Order (per user request)

1. **coord-core** — Foundation (hub server) ✅
2. **mode-system** — Modes, prompt-layers, skill-markdowns ✅
3. **resource-mgr** — Wake + leases (integrates existing subagent-pool) ✅
4. **channel-ui** — PWA + Discord bridge (deferred)

## Testing

Test profiles:
- **pwtest** (port 3083) — Primary test profile
- **pwtest2** (port 3090) — Secondary test profile

Each profile has its own `cordis.patch.yml` for plugin loading.

## Legacy Plugins

The following plugins existed before this collection and are maintained separately:

- **chrome-eye-bridge** — Chrome DevTools protocol bridge
- **chrome-eye-tools** — Browser inspection tools for dsh
