/**
 * DSH Mode System — mode-system
 *
 * Implements cards 04 (run-modes) and 05 (prompt-layers).
 *
 * Features:
 * - Mode registry with CRUD via hub API
 * - Prompt-layer compilation (core + mode + role + playbook)
 * - Skill-markdowns index (card 07)
 * - Commands: /mode create, /mode list, /mode set, /mode diff, /mode rollback
 *
 * Install: dsh plugin --profile PWtest add "github:<org>/dsh-agent-swarm#<sha>"
 */

const fs = require('fs').promises;
const path = require('path');

module.exports.name = 'mode-system';
module.exports.inject = [];

module.exports.apply = function(ctx, config) {
  const logger = ctx.get('logger') || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  logger.info('Mode System starting...');

  // Get optional services
  const command = ctx.get('command');

  // --- Configuration ---
  const cfg = config || {};
  const HUB_URL = process.env.DSH_COORD_HUB_URL || 'http://127.0.0.1:4100';
  const HUB_TOKEN = process.env.DSH_COORD_HUB_TOKEN || 'dev-token';
  const MODES_DIR = cfg.modesDir || path.join(process.cwd(), 'modes');

  // Ensure modes directory exists
  try { fs.mkdirSync(MODES_DIR, { recursive: true }); } catch {}

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

  // --- Mode Operations ---
  const saveMode = async (mode) => {
    const result = await hubCall('POST', '/modes', mode);
    return result;
  };

  const listModes = async () => {
    return await hubCall('GET', '/modes');
  };

  const getMode = async (modeId) => {
    return await hubCall('GET', `/modes/${modeId}`);
  };

  const updateMode = async (modeId, updates) => {
    return await hubCall('PUT', `/modes/${modeId}`, updates);
  };

  // --- Prompt Layer Compilation ---

  const compilePrompt = async (sessionId, modeId) => {
    const session = await hubCall('GET', `/sessions/${sessionId}`);
    if (!session || session.error) {
      return { compiled: '', layers: [], hash: '' };
    }

    const mode = await getMode(modeId);
    if (!mode || mode.error) return { compiled: '', layers: [], hash: '' };

    // Layer 1: Core (always included)
    const coreLayer = `# Session ${sessionId}
- Hub API: ${HUB_URL}
- Mode: ${mode.name || modeId}
- Return: summary + pointers (never raw dumps)
- Playbook: read on demand via read_playbook(section)`;

    // Layer 2: Mode slice
    const modeLayer = mode.description ? `# ${mode.name} Mode\n${mode.description}` : '';

    // Layer 3: Role slice
    const roleLayer = mode.role ? `# Role\n${mode.role}` : '';

    // Layer 4: Prompt layers
    const layers = [coreLayer];
    if (modeLayer) layers.push(modeLayer);
    if (roleLayer) layers.push(roleLayer);

    const compiled = layers.join('\n\n---\n\n');
    const hash = require('crypto').createHash('sha256').update(compiled).digest('hex');

    return { compiled, layers, hash, mode, sessionId };
  };

  // --- Mode Commands ---

  if (command) {
    // /mode list
    command('mode list')
      .description('List available modes')
      .action(async () => {
        const modes = await listModes();
        if (!modes || modes.error) return `Hub error: ${modes.error || JSON.stringify(modes)}`;
        if (!modes.length) return 'No modes configured. Use `/mode create` to add one.';
        return modes.map(m => `- **${m.name}** (v${m.version}) — ${m.description || 'No description'}`).join('\n');
      });

    // /mode create <name> --base <base>
    command('mode create <name> [flags]')
      .description('Create a new mode')
      .option('--base <base>', 'Base mode (standard, dev, etc.)')
      .option('--desc <desc>', 'Mode description')
      .option('--model <route>', 'Model route')
      .action(async ({ session, flags }, name) => {
        const mode = await saveMode({
          name,
          base_mode: flags.base || 'standard',
          description: flags.desc || `Mode: ${name}`,
          model_route: flags.model || null
        });
        if (!mode || mode.error) return `Failed: ${mode.error || JSON.stringify(mode)}`;

        // Also write local markdown file
        const modeFile = path.join(MODES_DIR, `${name}.md`);
        const content = `---\nid: ${mode.id}\nname: ${name}\nbase_mode: ${mode.base_mode}\nversion: ${mode.version}\n---\n\n# ${name}\n\n${mode.description || ''}`;
        await fs.writeFile(modeFile, content, 'utf8');

        return `✅ Mode '${name}' created (${mode.id}). File: ${modeFile}`;
      });

    // /mode set <name>
    command('mode set <name>')
      .description('Set current session to use a mode')
      .action(async ({ session }, name) => {
        const modes = await listModes();
        if (!modes || modes.error) return `Hub error: ${modes.error}`;
        const mode = modes.find(m => m.name === name);
        if (!mode) return `Mode '${name}' not found. Run /mode list to see available modes.`;

        // Compile prompt layers
        const compiled = await compilePrompt(session.id, mode.id);
        if (!compiled.compiled) return `Failed to compile prompt for mode '${name}'`;

        const tokenEstimate = Math.ceil(compiled.compiled.split(/\s+/).length / 1.3);
        return `✅ Mode '${name}' activated.\nCompiled prompt: ${tokenEstimate} tokens\nLayers: ${compiled.layers.length}\n---\n${compiled.compiled}`;
      });

    // /mode diff <modeA> <modeB>
    command('mode diff <modeA> <modeB>')
      .description('Diff two modes')
      .action(async ({ session }, nameA, nameB) => {
        const modes = await listModes();
        if (!modes || modes.error) return `Hub error: ${modes.error}`;
        const modeA = modes.find(m => m.name === nameA);
        const modeB = modes.find(m => m.name === nameB);
        if (!modeA) return `Mode '${nameA}' not found.`;
        if (!modeB) return `Mode '${nameB}' not found.`;

        const diff = [];
        if (modeA.description !== modeB.description) diff.push(`  description: '${modeA.description}' → '${modeB.description}'`);
        if (modeA.model_route !== modeB.model_route) diff.push(`  model_route: '${modeA.model_route}' → '${modeB.model_route}'`);
        if (modeA.autonomy !== modeB.autonomy) diff.push(`  autonomy: ${modeA.autonomy} → ${modeB.autonomy}`);
        if (modeA.context_budget !== modeB.context_budget) diff.push(`  context_budget: ${modeA.context_budget} → ${modeB.context_budget}`);

        return diff.length ? `Diff ${nameA} ↔ ${nameB}:\n${diff.join('\n')}` : `Modes '${nameA}' and '${nameB}' are identical.`;
      });
  }

  // --- Cordis Service: modeSystem ---
  ctx.provide('modeSystem', {
    listModes,
    createMode: (params) => saveMode(params),
    getMode,
    updateMode,
    compilePrompt,
    compileAndSet: async (sessionId, modeId) => {
      const compiled = await compilePrompt(sessionId, modeId);
      const hub = ctx.get('coordHub');
      if (hub) {
        hub.updateState(sessionId, 'prompt_hash', compiled.hash);
        hub.updateState(sessionId, 'prompt_version', compiled.layers.length);
      }
      return compiled;
    }
  });

  // --- Effect: Listen for session/mode events ---
  ctx.effect(() => {
    ctx.on('session/update', async (event) => {
      if (event?.mode_id && event?.session_id) {
        logger.info(`Mode changed for session ${event.session_id}: ${event.mode_id}`);
        const hub = ctx.get('coordHub');
        if (hub) {
          const compiled = await compilePrompt(event.session_id, event.mode_id);
          hub.updateState(event.session_id, 'prompt_hash', compiled.hash);
          hub.updateState(event.session_id, 'prompt_version', compiled.layers.length);
        }
      }
    });

    return () => {};
  });

  logger.info('Mode System initialized');
};
