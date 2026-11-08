/**
 * DSH Coordination Core — coord-core
 *
 * Implements cards 00 (hub server), 01 (session-store), 02 (broadcast).
 *
 * Architecture:
 * - Hub server: plain http module, JSON file store, REST API
 * - Session-store: subscribes to session events, projects to hub
 * - Broadcast: registers model tools for pub/sub
 *
 * This plugin focuses on cards 3/4 (run-modes, prompt-layers) integration
 * before incorporating session-store and broadcast fully.
 *
 * Install: dsh plugin --profile PWtest add "github:<org>/dsh-agent-swarm#<sha>"
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

module.exports.name = 'coord-core';
module.exports.inject = [];

module.exports.apply = function(ctx, config) {
  const logger = ctx.get('logger') || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  logger.info('Coordination Core starting...');

  // --- Configuration ---
  const HUB_PORT = parseInt(process.env.DSH_COORD_HUB_PORT) || 4100;
  const HUB_TOKEN = process.env.DSH_COORD_HUB_TOKEN || 'dev-token';
  const HUB_DB_DIR = path.join(process.cwd(), '.dsh-coord-hub');

  // Ensure DB directory exists
  if (!fs.existsSync(HUB_DB_DIR)) {
    fs.mkdirSync(HUB_DB_DIR, { recursive: true });
  }

  // --- JSON File Store ---
  const store = {
    readFile(name) {
      try {
        const filePath = path.join(HUB_DB_DIR, name + '.json');
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch { return []; }
    },
    writeFile(name, data) {
      fs.writeFileSync(path.join(HUB_DB_DIR, name + '.json'), JSON.stringify(data, null, 2), 'utf8');
    },
    generateId() {
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }
  };

  // Load all stores
  store.sessions = store.readFile('sessions');
  store.broadcasts = store.readFile('broadcasts');
  store.subscriptions = store.readFile('subscriptions');
  store.deliveries = store.readFile('deliveries');
  store.modes = store.readFile('modes');
  store.leases = store.readFile('leases');
  store.state = store.readFile('state');
  store.watcherQueue = store.readFile('watcherQueue');

  // Helper to save all stores
  const saveAll = () => {
    ['sessions', 'broadcasts', 'subscriptions', 'deliveries', 'modes', 'leases', 'state', 'watcherQueue'].forEach(name => {
      store.writeFile(name, store[name]);
    });
  };

  // --- Hub Server ---
  const parseBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch(e) { resolve({}); } });
    req.on('error', reject);
  });

  const sendJson = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Check auth header
  const checkAuth = (req) => {
    const authHeader = req.headers['authorization'];
    return !authHeader || authHeader === 'Bearer ' + HUB_TOKEN;
  };

  const server = http.createServer(async (req, res) => {
    const parsed = new URL(req.url, `http://127.0.0.1:${HUB_PORT}`);
    const pathname = parsed.pathname;
    const method = req.method;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') { sendJson(res, 200, {}); return; }

    // Health endpoint - no auth required
    if (pathname === '/health' && method === 'GET') {
      sendJson(res, 200, { status: 'ok', port: HUB_PORT, sessions: store.sessions.length });
      return;
    }

    // Auth check
    if (!checkAuth(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    // === SESSIONS ===
    if (pathname === '/sessions' && method === 'GET') {
      sendJson(res, 200, store.sessions);
      return;
    }

    if (pathname === '/sessions' && method === 'POST') {
      const body = await parseBody(req);
      const session = {
        id: store.generateId(),
        parent_id: body.parent_id || null,
        project_id: body.project_id || 'default',
        mode_id: body.mode_id || null,
        prompt_version: 0,
        status: 'created',
        model_route: body.model_route || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.sessions.push(session);
      saveAll();
      logger.info(`Session created: ${session.id}`);
      sendJson(res, 201, session);
      return;
    }

    const sessionMatch = pathname.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch && method === 'GET') {
      const sid = sessionMatch[1];
      const session = store.sessions.find(s => s.id === sid);
      if (session) {
        sendJson(res, 200, session);
      } else {
        sendJson(res, 404, { error: 'Session not found' });
      }
      return;
    }

    if (sessionMatch && method === 'PUT') {
      const sid = sessionMatch[1];
      const idx = store.sessions.findIndex(s => s.id === sid);
      if (idx === -1) { sendJson(res, 404, { error: 'Session not found' }); return; }
      const body = await parseBody(req);
      Object.assign(store.sessions[idx], body, { updated_at: new Date().toISOString() });
      saveAll();
      sendJson(res, 200, store.sessions[idx]);
      return;
    }

    if (sessionMatch && method === 'DELETE') {
      const sid = sessionMatch[1];
      store.sessions = store.sessions.filter(s => s.id !== sid);
      saveAll();
      sendJson(res, 200, { deleted: true });
      return;
    }

    // === STATE (key/value per session) ===
    const stateMatch = pathname.match(/^\/sessions\/([^\/]+)\/state$/);
    if (stateMatch && method === 'GET') {
      const sid = stateMatch[1];
      const stateItems = store.state.filter(s => s.session_id === sid);
      sendJson(res, 200, stateItems);
      return;
    }

    if (stateMatch && method === 'PUT') {
      const sid = stateMatch[1];
      const body = await parseBody(req);
      const { key, value } = body;
      if (!key) { sendJson(res, 400, { error: 'key required' }); return; }

      // Check if session exists
      if (!store.sessions.find(s => s.id === sid)) {
        sendJson(res, 404, { error: 'Session not found' });
        return;
      }

      const existing = store.state.find(s => s.session_id === sid && s.key === key);
      if (existing) {
        existing.value = value;
        existing.version = (existing.version || 0) + 1;
        existing.updated_at = new Date().toISOString();
      } else {
        store.state.push({ session_id: sid, key, value, version: 1, updated_at: new Date().toISOString() });
      }
      saveAll();
      sendJson(res, 200, { session_id: sid, key, value, version: (store.state.find(s => s.session_id === sid && s.key === key)?.version || 1) });
      return;
    }

    // === MODES ===
    if (pathname === '/modes' && method === 'GET') {
      sendJson(res, 200, store.modes);
      return;
    }

    if (pathname === '/modes' && method === 'POST') {
      const body = await parseBody(req);
      const mode = {
        id: store.generateId(),
        name: body.name || `mode-${store.generateId().slice(0, 6)}`,
        base_mode: body.base_mode || null,
        description: body.description || '',
        model_route: body.model_route || null,
        tools_json: JSON.stringify(body.tools_json || []),
        autonomy: body.autonomy !== undefined ? body.autonomy : 1,
        context_budget: body.context_budget || null,
        prompt_layers_json: JSON.stringify(body.prompt_layers_json || []),
        version: 1,
        created_at: new Date().toISOString()
      };
      store.modes.push(mode);
      saveAll();
      logger.info(`Mode created: ${mode.id} (${mode.name})`);
      sendJson(res, 201, mode);
      return;
    }

    const modeMatch = pathname.match(/^\/modes\/([^\/]+)$/);
    if (modeMatch && method === 'GET') {
      const mid = modeMatch[1];
      const mode = store.modes.find(m => m.id === mid);
      if (mode) { sendJson(res, 200, mode); }
      else { sendJson(res, 404, { error: 'Mode not found' }); }
      return;
    }

    if (modeMatch && method === 'PUT') {
      const mid = modeMatch[1];
      const idx = store.modes.findIndex(m => m.id === mid);
      if (idx === -1) { sendJson(res, 404, { error: 'Mode not found' }); return; }
      const body = await parseBody(req);
      const prev = { ...store.modes[idx] };
      Object.assign(store.modes[idx], body, {
        updated_at: new Date().toISOString(),
        version: (store.modes[idx].version || 0) + 1
      });
      saveAll();
      sendJson(res, 200, { ...store.modes[idx], prev });
      return;
    }

    if (modeMatch && method === 'DELETE') {
      const mid = modeMatch[1];
      store.modes = store.modes.filter(m => m.id !== mid);
      saveAll();
      sendJson(res, 200, { deleted: true });
      return;
    }

    // === BROADCASTS ===
    if (pathname === '/broadcasts' && method === 'POST') {
      const body = await parseBody(req);
      const broadcast = {
        id: store.generateId(),
        project_id: body.project_id || 'default',
        name: body.name || `broadcast-${store.generateId().slice(0, 6)}`,
        summary: body.summary || '',
        payload_ref: body.payload_ref || null,
        created_at: new Date().toISOString()
      };
      store.broadcasts.push(broadcast);
      saveAll();

      // Create pending deliveries for all subscriptions matching this broadcast name
      if (broadcast.name) {
        store.subscriptions.forEach(sub => {
          if (sub.broadcast_name === broadcast.name || sub.broadcast_name === '*') {
            store.deliveries.push({
              id: store.generateId(),
              broadcast_id: broadcast.id,
              subscriber_id: sub.subscriber_id,
              status: 'pending',
              wake_policy: sub.wake_policy || 'immediate',
              deliver_at: new Date().toISOString(),
              retry_count: 0,
              created_at: new Date().toISOString()
            });
          }
        });
        saveAll();
      }

      sendJson(res, 201, broadcast);
      return;
    }

    if (pathname === '/broadcasts' && method === 'GET') {
      sendJson(res, 200, store.broadcasts);
      return;
    }

    // Get deliveries for a session's inbox
    const inboxMatch = pathname.match(/^\/sessions\/([^\/]+)\/inbox$/);
    if (inboxMatch && method === 'GET') {
      const sid = inboxMatch[1];
      const deliveries = store.deliveries.filter(d => {
        const sub = store.subscriptions.find(s => s.subscriber_id === sid && d.broadcast_id);
        return sub;
      });
      sendJson(res, 200, deliveries);
      return;
    }

    // === LEASES ===
    if (pathname === '/leases' && method === 'GET') {
      sendJson(res, 200, store.leases);
      return;
    }

    if (pathname === '/leases' && method === 'POST') {
      const body = await parseBody(req);
      const { action, resource, holder, ttl } = body;

      if (action === 'checkout') {
        const now = new Date();
        const expires = new Date(now.getTime() + (ttl || 300000));
        const lease = {
          id: store.generateId(),
          resource,
          holder_session_id: holder,
          acquired_at: now.toISOString(),
          expires_at: expires.toISOString()
        };
        store.leases.push(lease);
        saveAll();
        sendJson(res, 201, lease);
        return;
      }

      if (action === 'checkin') {
        const idx = store.leases.findIndex(l => l.resource === resource && l.holder_session_id === holder && new Date(l.expires_at) > new Date());
        if (idx === -1) { sendJson(res, 404, { error: 'Lease not found' }); return; }
        store.leases.splice(idx, 1);
        saveAll();
        sendJson(res, 200, { released: resource });
        return;
      }

      sendJson(res, 400, { error: 'Unknown lease action' });
      return;
    }

    // === SUBSCRIPTIONS ===
    if (pathname === '/subscriptions' && method === 'POST') {
      const body = await parseBody(req);
      const sub = {
        id: store.generateId(),
        subscriber_id: body.subscriber_id,
        broadcast_name: body.broadcast_name,
        wake_policy: body.wake_policy || 'immediate',
        created_at: new Date().toISOString()
      };
      store.subscriptions.push(sub);
      saveAll();
      sendJson(res, 201, sub);
      return;
    }

    // === DELIVERIES ===
    if (pathname === '/deliveries' && method === 'GET') {
      sendJson(res, 200, store.deliveries);
      return;
    }

    // Ack delivery
    const ackMatch = pathname.match(/^\/deliveries\/([^\/]+)\/ack$/);
    if (ackMatch && method === 'POST') {
      const did = ackMatch[1];
      const idx = store.deliveries.findIndex(d => d.id === did);
      if (idx === -1) { sendJson(res, 404, { error: 'Delivery not found' }); return; }
      store.deliveries[idx].status = 'acknowledged';
      store.deliveries[idx].claimed_at = new Date().toISOString();
      saveAll();
      sendJson(res, 200, store.deliveries[idx]);
      return;
    }

    // 404 for everything else
    sendJson(res, 404, { error: 'Not found', path: pathname });
  });

  // Start server
  server.listen(HUB_PORT, '127.0.0.1', () => {
    logger.info(`Hub server listening on 127.0.0.1:${HUB_PORT}`);
  });

  server.on('error', (err) => {
    logger.error(`Hub server error: ${err.message}`);
  });

  // --- Cordis Service: coordHub ---
  ctx.provide('coordHub', {
    // Session operations
    createSession: (params) => {
      const session = {
        id: store.generateId(),
        parent_id: params.parent_id || null,
        project_id: params.project_id || 'default',
        mode_id: params.mode_id || null,
        prompt_version: 0,
        status: 'created',
        model_route: params.model_route || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.sessions.push(session);
      saveAll();
      return session;
    },

    getSession: (id) => store.sessions.find(s => s.id === id),
    getSessions: () => [...store.sessions],

    // Mode operations
    createMode: (params) => {
      const mode = {
        id: store.generateId(),
        name: params.name || `mode-${store.generateId().slice(0, 6)}`,
        base_mode: params.base_mode || null,
        description: params.description || '',
        model_route: params.model_route || null,
        tools_json: JSON.stringify(params.tools_json || []),
        autonomy: params.autonomy !== undefined ? params.autonomy : 1,
        context_budget: params.context_budget || null,
        prompt_layers_json: JSON.stringify(params.prompt_layers_json || []),
        version: 1,
        created_at: new Date().toISOString()
      };
      store.modes.push(mode);
      saveAll();
      return mode;
    },

    getMode: (id) => store.modes.find(m => m.id === id),
    getModes: () => [...store.modes],

    // State operations
    getState: (sid) => store.state.filter(s => s.session_id === sid),
    updateState: (sid, key, value) => {
      const existing = store.state.find(s => s.session_id === sid && s.key === key);
      if (existing) {
        existing.value = value;
        existing.version = (existing.version || 0) + 1;
        existing.updated_at = new Date().toISOString();
      } else {
        store.state.push({ session_id: sid, key, value, version: 1, updated_at: new Date().toISOString() });
      }
      saveAll();
      return { session_id: sid, key, value, version: (store.state.find(s => s.session_id === sid && s.key === key)?.version || 1) };
    },

    // Broadcast operations
    createBroadcast: (params) => {
      const broadcast = {
        id: store.generateId(),
        project_id: params.project_id || 'default',
        name: params.name || `broadcast-${store.generateId().slice(0, 6)}`,
        summary: params.summary || '',
        payload_ref: params.payload_ref || null,
        created_at: new Date().toISOString()
      };
      store.broadcasts.push(broadcast);
      saveAll();
      return broadcast;
    },

    getBroadcasts: () => [...store.broadcasts],
    subscribe: (subscriberId, broadcastName, wakePolicy) => {
      const sub = {
        id: store.generateId(),
        subscriber_id: subscriberId,
        broadcast_name: broadcastName,
        wake_policy: wakePolicy || 'immediate',
        created_at: new Date().toISOString()
      };
      store.subscriptions.push(sub);
      saveAll();
      return sub;
    },

    // Lease operations
    checkoutLease: (resource, holder, ttl) => {
      const lease = {
        id: store.generateId(),
        resource,
        holder_session_id: holder,
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (ttl || 300000)).toISOString()
      };
      store.leases.push(lease);
      saveAll();
      return lease;
    },

    checkinLease: (resource, holder) => {
      const idx = store.leases.findIndex(l => l.resource === resource && l.holder_session_id === holder && new Date(l.expires_at) > new Date());
      if (idx === -1) return null;
      store.leases.splice(idx, 1);
      saveAll();
      return { released: resource };
    },

    isLeaseHeld: (resource) => {
      return store.leases.some(l => l.resource === resource && new Date(l.expires_at) > new Date());
    },

    getLeases: () => [...store.leases],

    // Hub info
    getHubInfo: () => ({ port: HUB_PORT, sessions: store.sessions.length, modes: store.modes.length })
  });

  logger.info('Coordination Core initialized');
};
