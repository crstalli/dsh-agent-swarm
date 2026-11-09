/**
 * Simple Web UI for monitoring DSH Agent Swarm Hub
 * 
 * This provides a web interface at http://127.0.0.1:4100/ui
 * to view, monitor, and interact with the hub server.
 */

const http = require('http');
const { URL } = require('url');

const HUB_PORT = process.env.DSH_COORD_HUB_PORT || 4100;
const HUB_URL = `http://127.0.0.1:${HUB_PORT}`;
const TOKEN = process.env.DSH_COORD_HUB_TOKEN || 'dev-token';

function getHubData(path) {
  return fetch(`${HUB_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  }).then(r => r.json()).catch(() => []);
}

function renderPage(title, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - DSH Agent Swarm Hub</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .status { padding: 15px; border-radius: 5px; margin: 20px 0; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
    .card { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 10px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .endpoint { background: #f8f9fa; padding: 10px; border-left: 4px solid #007acc; margin: 10px 0; }
    .nav { display: flex; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
    .nav a { text-decoration: none; color: #007acc; font-weight: 500; }
    .nav a:hover { text-decoration: underline; }
    .nav a.active { color: #333; border-bottom: 2px solid #007acc; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 DSH Agent Swarm Hub Monitor</h1>
    <div class="nav">
      <a href="/ui" class="${title === 'Dashboard' ? 'active' : ''}">Dashboard</a>
      <a href="/ui/modes">Modes</a>
      <a href="/ui/sessions">Sessions</a>
      <a href="/ui/broadcasts">Broadcasts</a>
      <a href="/ui/leases">Leases</a>
    </div>
    ${content}
  </div>
</body>
</html>
  `;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:4100`);
  const pathname = url.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Dashboard
  if (pathname === '/ui' || pathname === '/ui/') {
    try {
      const health = await fetch(`${HUB_URL}/health`).then(r => r.json());
      
      const content = `
        <div class="status success">
          <strong>✅ Hub Server Running</strong><br>
          Port: ${HUB_PORT} | Sessions: ${health.sessions} | Modes: ${health.modes || 'N/A'}
        </div>
        
        <h2>📊 System Overview</h2>
        <div class="grid">
          <div class="card">
            <h3>Hub Status</h3>
            <p><code>http://127.0.0.1:${HUB_PORT}</code></p>
            <p>Status: <strong>${health.status}</strong></p>
          </div>
          <div class="card">
            <h3>Active Data</h3>
            <p>Sessions: ${health.sessions}</p>
            <p>Modes: ${health.modes || 0}</p>
          </div>
        </div>
        
        <h2>🔌 API Endpoints</h2>
        <div class="endpoint">
          <strong>Health Check:</strong> <code>GET /health</code>
        </div>
        <div class="endpoint">
          <strong>Modes:</strong> <code>GET/POST /modes</code>
        </div>
        <div class="endpoint">
          <strong>Sessions:</strong> <code>GET /sessions</code>
        </div>
        <div class="endpoint">
          <strong>Broadcasts:</strong> <code>GET /broadcasts</code>
        </div>
      `;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage('Dashboard', content));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderPage('Error', `<div class="status warning">Hub not responding: ${e.message}</div>`));
    }
  }
  
  // Modes page
  else if (pathname === '/ui/modes') {
    try {
      const modes = await getHubData('/modes');
      
      let tableRows = modes.map(m => `
        <tr>
          <td><code>${m.id || m.name}</code></td>
          <td>${m.name || 'N/A'}</td>
          <td>${m.base_mode || 'N/A'}</td>
          <td>${m.description || '-'}</td>
        </tr>
      `).join('');
      
      if (!tableRows) tableRows = '<tr><td colspan="4">No modes found</td></tr>';
      
      const content = `
        <h2>🎭 Run Modes</h2>
        <p>Total: ${modes.length} modes</p>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Base Mode</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        
        <div class="card">
          <h3>➕ Create New Mode</h3>
          <p>Use API: <code>POST /modes</code></p>
          <p>Auth: <code>Authorization: Bearer dev-token</code></p>
        </div>
      `;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage('Modes', content));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderPage('Error', `<div class="status warning">Error loading modes: ${e.message}</div>`));
    }
  }
  
  // Sessions page
  else if (pathname === '/ui/sessions') {
    try {
      const sessions = await getHubData('/sessions');
      
      let tableRows = sessions.map(s => `
        <tr>
          <td><code>${s.id || s.session_id}</code></td>
          <td>${s.status || 'active'}</td>
          <td>${s.last_active ? new Date(s.last_active).toLocaleString() : 'N/A'}</td>
        </tr>
      `).join('');
      
      if (!tableRows) tableRows = '<tr><td colspan="3">No sessions found</td></tr>';
      
      const content = `
        <h2>👥 Sessions</h2>
        <p>Total: ${sessions.length} sessions</p>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage('Sessions', content));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderPage('Error', `<div class="status warning">Error loading sessions: ${e.message}</div>`));
    }
  }
  
  // Broadcasts page
  else if (pathname === '/ui/broadcasts') {
    try {
      const broadcasts = await getHubData('/broadcasts');
      
      let tableRows = broadcasts.map(b => `
        <tr>
          <td><code>${b.id || b.broadcast_id}</code></td>
          <td>${b.type || 'N/A'}</td>
          <td>${b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}</td>
        </tr>
      `).join('');
      
      if (!tableRows) tableRows = '<tr><td colspan="3">No broadcasts found</td></tr>';
      
      const content = `
        <h2>📢 Broadcasts</h2>
        <p>Total: ${broadcasts.length} broadcasts</p>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage('Broadcasts', content));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderPage('Error', `<div class="status warning">Error loading broadcasts: ${e.message}</div>`));
    }
  }
  
  // Leases page
  else if (pathname === '/ui/leases') {
    try {
      const leases = await getHubData('/leases');
      
      let tableRows = leases.map(l => `
        <tr>
          <td><code>${l.id || l.resource}</code></td>
          <td>${l.resource || 'N/A'}</td>
          <td>${l.holder_session_id || 'N/A'}</td>
          <td>${l.expires_at ? new Date(l.expires_at).toLocaleString() : 'N/A'}</td>
        </tr>
      `).join('');
      
      if (!tableRows) tableRows = '<tr><td colspan="4">No leases found</td></tr>';
      
      const content = `
        <h2>🔒 Leases</h2>
        <p>Total: ${leases.length} active leases</p>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Resource</th>
              <th>Holder</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage('Leases', content));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderPage('Error', `<div class="status warning">Error loading leases: ${e.message}</div>`));
    }
  }
  
  // API proxy - allow invoking endpoints via UI
  else if (pathname.startsWith('/ui/api/')) {
    const apiPath = pathname.replace('/ui/api/', '');
    try {
      const data = await getHubData(`/${apiPath}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  }
  
  // Not found
  else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(renderPage('Not Found', '<div class="status warning">Page not found</div>'));
  }
});

server.listen(HUB_PORT, () => {
  console.log('🔧 DSH Agent Swarm Hub UI');
  console.log('===========================');
  console.log(`UI running at: http://127.0.0.1:${HUB_PORT}/ui`);
  console.log(`API base: http://127.0.0.1:${HUB_PORT}`);
  console.log('');
  console.log('Pages:');
  console.log('  /ui - Dashboard');
  console.log('  /ui/modes - View modes');
  console.log('  /ui/sessions - View sessions');
  console.log('  /ui/broadcasts - View broadcasts');
  console.log('  /ui/leases - View leases');
  console.log('');
  console.log('The UI proxies to the hub server automatically.');
});

module.exports = server;
