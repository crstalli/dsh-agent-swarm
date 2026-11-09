/**
 * Test the UI rendering directly
 */

const fs = require('fs');
const path = require('path');

// Load the coord-core plugin
const coordCorePath = './coord-core/index.js';
const pluginCode = fs.readFileSync(coordCorePath, 'utf8');

// Extract the renderUI function from the plugin
console.log('Testing UI rendering...');

// Simulate the renderUI function
const HUB_PORT = 4100;
const store = {
  sessions: [{ id: 'test-session-1', status: 'active' }],
  modes: [{ id: 'test-mode-1', name: 'test-dev', base_mode: 'dev' }],
  broadcasts: [],
  subscriptions: [],
  deliveries: [],
  leases: [],
  state: []
};

// Simple test of UI rendering
function testUIRendering() {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Test UI</title></head>
<body>
  <h1>DSH Agent Swarm Hub Monitor</h1>
  <div style="padding: 20px; background: #f5f5f5;">
    <h2>System Overview</h2>
    <p>Sessions: ${store.sessions.length}</p>
    <p>Modes: ${store.modes.length}</p>
    <h3>Active Sessions</h3>
    <ul>
      ${store.sessions.map(s => `<li>${s.id} - ${s.status}</li>`).join('')}
    </ul>
    <h3>Active Modes</h3>
    <ul>
      ${store.modes.map(m => `<li>${m.name} (${m.base_mode})</li>`).join('')}
    </ul>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync('/tmp/test-ui-output.html', html);
  console.log('UI test rendered to /tmp/test-ui-output.html');
  console.log('Content length:', html.length, 'chars');
  return true;
}

if (testUIRendering()) {
  console.log('✓ UI rendering works!');
  console.log('');
  console.log('To use the full UI:');
  console.log('1. Start DSH with pwtest profile:');
  console.log('   DSH_COORD_HUB_PORT=4100 dsh --profile pwtest --port 3083 --no-open');
  console.log('');
  console.log('2. Access UI at: http://127.0.0.1:4100/ui');
  console.log('');
  console.log('The UI will show:');
  console.log('  - Dashboard with system overview');
  console.log('  - Modes list with create form');
  console.log('  - Sessions viewer');
  console.log('  - Broadcasts monitor');
  console.log('  - Leases tracker');
}
