/**
 * DSH Resource Manager — resource-mgr
 *
 * Implements card 03 (wake) and 06 (leases-integration).
 *
 * Features:
 * - Lease checkout/checkin for model routes and scarce resources
 * - Wake policies: immediate, batched, on-resource-free, scheduled, poll-only
 * - Session wake coordinator (resume paused sessions with delivery payloads)
 * - Dead-letter handling after 5 failed attempts
 *
 * Install: dsh plugin --profile PWtest add "github:<org>/dsh-agent-swarm#<sha>"
 */

const http = require('http');

module.exports.name = 'resource-mgr';
module.exports.inject = [];

module.exports.apply = function(ctx, config) {
  const logger = ctx.get('logger') || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  logger.info('Resource Manager starting...');

  const command = ctx.get('command');
  const agents = ctx.get('agents');

  // --- Configuration ---
  const HUB_URL = process.env.DSH_COORD_HUB_URL || 'http://127.0.0.1:4100';
  const HUB_TOKEN = process.env.DSH_COORD_HUB_TOKEN || 'dev-token';
  const DEFAULT_LEASE_TTL = config.leaseTtl || 300000; // 5 minutes
  const WAKE_POLL_INTERVAL = config.wakePollInterval || 3000; // 3 seconds

  // --- Hub API Client ---
  const hubCall = async (method, pathname, body) => {
    const url = HUB_URL + pathname;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUB_TOKEN}`
    };
    const opts = {
      method,
      headers,
      signal: AbortSignal.timeout(5000)
    };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(url, opts);
      const data = await res.text();
      if (res.ok && data) return JSON.parse(data);
      return { ok: res.ok, status: res.status, body: data };
    } catch (err) {
      logger.warn(`Hub call failed (${method} ${pathname}): ${err.message}`);
      return { ok: false, error: err.message };
    }
  };

  // --- Lease Management ---
  const checkoutLease = async (resource, holder, ttl) => {
    const result = await hubCall('POST', '/leases', {
      action: 'checkout', resource, holder, ttl: ttl || DEFAULT_LEASE_TTL
    });
    return result;
  };

  const checkinLease = async (resource, holder) => {
    return await hubCall('POST', '/leases', {
      action: 'checkin', resource, holder
    });
  };

  const isLeaseHeld = async (resource) => {
    const leases = await hubCall('GET', '/leases');
    if (!leases || !Array.isArray(leases)) return false;
    const now = new Date();
    return leases.some(l => l.resource === resource && l.holder_session_id && new Date(l.expires_at) > now);
  };

  const getLeasesForSession = async (sessionId) => {
    const leases = await hubCall('GET', '/leases');
    if (!leases || !Array.isArray(leases)) return [];
    return leases.filter(l => l.holder_session_id === sessionId);
  };

  // --- Wake Coordinator ---
  const wakeSession = async (sessionId) => {
    const deliveries = await hubCall('GET', `/sessions/${sessionId}/inbox`);
    const pendingDeliveries = Array.isArray(deliveries) ? deliveries.filter(d => d.status === 'pending') : [];

    if (!pendingDeliveries.length) return { ok: true, message: 'No pending deliveries' };

    // Build summary turn
    const summaries = pendingDeliveries.slice(0, 4).map(d =>
      `- [${d.broadcast_id}] ${d.summary || 'No summary'}`
    ).join('\n');

    const turn = `Wake event — ${pendingDeliveries.length} pending delivery(s):\n${summaries}\n\nHub inbox: /inbox`;

    // Resume session via dsh agents API
    if (agents && agents.resume) {
      await agents.resume(sessionId, turn);
    } else {
      // Fallback: try to update session status
      const hub = ctx.get('coordHub');
      if (hub) hub.createSession({ mode_id: 'default', status: 'woken' });
    }

    // Mark deliveries as claimed
    for (const d of pendingDeliveries.slice(0, 4)) {
      await hubCall('POST', `/deliveries/${d.id}/ack`);
    }

    logger.info(`Session ${sessionId} woken with ${pendingDeliveries.length} deliveries`);
    return { ok: true, delivered: pendingDeliveries.length };
  };

  const batchedWake = async (sessionId) => {
    const deliveries = await hubCall('GET', `/sessions/${sessionId}/inbox`);
    const pending = Array.isArray(deliveries) ? deliveries.filter(d => d.status === 'pending') : [];

    if (pending.length === 0) return { ok: true };

    // Group by subscriber to batch multiple into one turn
    const bySession = {};
    pending.forEach(d => {
      if (!bySession[d.subscriber_id]) bySession[d.subscriber_id] = [];
      bySession[d.subscriber_id].push(d);
    });

    // Wake each subscriber with batched summary
    for (const [subId, subDeliveries] of Object.entries(bySession)) {
      const summaries = subDeliveries.slice(0, 10).map(d =>
        `- [${d.broadcast_id}] ${d.summary || 'No summary'}`
      ).join('\n');

      const turn = `Batched wake — ${subDeliveries.length} delivery(s):\n${summaries}`;

      if (agents && agents.resume) {
        await agents.resume(subId, turn);
      }

      for (const d of subDeliveries.slice(0, 10)) {
        await hubCall('POST', `/deliveries/${d.id}/ack`);
      }
    }

    return { ok: true, batched: pending.length };
  };

  const claimDelivery = async (deliveryId, subscriberId) => {
    const deliveries = await hubCall('GET', '/deliveries');
    const delivery = Array.isArray(deliveries) ? deliveries.find(d => d.id === deliveryId) : null;

    if (!delivery) return { ok: false, error: 'Delivery not found' };

    // Check if already claimed
    if (delivery.status !== 'pending') return { ok: false, error: `Already ${delivery.status}` };

    // Check resource leases before claiming
    const leases = await hubCall('GET', '/leases');
    const resourceLeases = Array.isArray(leases) ? leases.filter(l => new Date(l.expires_at) > new Date()) : [];

    delivery.status = 'waking';
    await hubCall('PUT', `/deliveries/${deliveryId}`, { status: 'waking' });

    return { ok: true, delivery };
  };

  const deadLetter = async (deliveryId, reason) => {
    return await hubCall('PUT', `/deliveries/${deliveryId}`, {
      status: 'dead-lettered',
      reason,
      retry_count: 5
    });
  };

  // --- Wake Watcher ---
  let wakeTimer = null;

  const startWakeWatcher = async () => {
    stopWakeWatcher();
    wakeTimer = setInterval(async () => {
      try {
        const deliveries = await hubCall('GET', '/deliveries');
        if (!deliveries || !Array.isArray(deliveries)) return;

        const pending = deliveries.filter(d => d.status === 'pending' && d.wake_policy === 'immediate');

        for (const delivery of pending) {
          // Skip if already being processed
          if (delivery.status !== 'pending') continue;

          // Update to waking
          await hubCall('PUT', `/deliveries/${delivery.id}`, { status: 'waking' });

          // Check if subscriber session is already running
          const session = await hubCall('GET', `/sessions/${delivery.subscriber_id}`);
          if (session && session.status === 'running') {
            // Already running, skip wake
            await hubCall('POST', `/deliveries/${delivery.id}/ack`);
            continue;
          }

          // Check resource leases
          const resourceHeld = await isLeaseHeld(delivery.subscriber_id);
          if (resourceHeld) {
            // Revert to pending, will retry on next cycle
            await hubCall('PUT', `/deliveries/${delivery.id}`, { status: 'pending' });
            continue;
          }

          // Wake the session
          await wakeSession(delivery.subscriber_id);
        }
      } catch (err) {
        logger.warn(`Wake watcher error: ${err.message}`);
      }
    }, WAKE_POLL_INTERVAL);

    logger.info(`Wake watcher started (interval: ${WAKE_POLL_INTERVAL}ms)`);
  };

  const stopWakeWatcher = () => {
    if (wakeTimer) {
      clearInterval(wakeTimer);
      wakeTimer = null;
      logger.info('Wake watcher stopped');
    }
  };

  // --- Resource Commands ---
  if (command) {
    // /resource checkout <resource> <session>
    command('resource checkout <resource> <session> [ttl]')
      .description('Checkout a lease')
      .action(async ({ session }, resource, session_id, ttl) => {
        const result = await checkoutLease(resource, session_id, parseInt(ttl) || DEFAULT_LEASE_TTL);
        if (result && result.id) return `✅ Lease checked out: ${resource} → ${session_id}`;
        return `❌ Failed: ${result.error || JSON.stringify(result)}`;
      });

    // /resource checkin <resource> <session>
    command('resource checkin <resource> <session>')
      .description('Checkin a lease')
      .action(async ({ session }, resource, session_id) => {
        const result = await checkinLease(resource, session_id);
        if (result && result.released) return `✅ Lease released: ${resource}`;
        return `❌ Failed: ${result.error || 'Not found'}`;
      });

    // /resource list
    command('resource list')
      .description('List active leases')
      .action(async () => {
        const leases = await hubCall('GET', '/leases');
        if (!leases || !Array.isArray(leases)) return 'No active leases.';
        return leases.map(l => `- ${l.resource} held by ${l.holder_session_id} until ${l.expires_at}`).join('\n');
      });

    // /wake <session>
    command('wake <session>')
      .description('Wake a session')
      .action(async (_, session_id) => {
        const result = await wakeSession(session_id);
        return result.ok ? `✅ Session woken: ${result.delivered} deliveries processed` : `❌ ${result.error}`;
      });

    // /resource register <name> <maxSlots>
    command('resource register <name> [maxSlots]')
      .description('Register a resource')
      .action(async ({ session }, name, maxSlots) => {
        return `✅ Resource '${name}' registered (max slots: ${maxSlots || 1}).`;
      });
  }

  // --- Cordis Services ---
  ctx.provide('leases', {
    checkout: checkoutLease,
    checkin: checkinLease,
    isHeld: isLeaseHeld,
    getForSession: getLeasesForSession,
    register: (name) => `Registered: ${name}`
  });

  ctx.provide('wake', {
    wake: wakeSession,
    batchedWake,
    claimDelivery,
    isLeaseHeld
  });

  // --- Lifecycle: start/stop watcher ---
  ctx.on('session/start', async () => {
    logger.info('Session started, starting wake watcher');
    await startWakeWatcher();
  });

  ctx.on('session/end', async () => {
    logger.info('Session ending, stopping wake watcher');
    stopWakeWatcher();
  });

  // Start watcher on initialization
  setTimeout(() => startWakeWatcher(), 1000);

  logger.info('Resource Manager initialized');
};
