/**
 * Playwright test for DSH Agent Swarm plugins
 * Tests coord-core, mode-system, resource-mgr plugins
 */

const { chromium } = require('/mnt/f/nvm/versions/node/v24.19.0/lib/node_modules/playwright-core/lib/client/chromium.js');

async function testPlugins() {
  console.log('🚀 Starting DSH Agent Swarm Plugin Tests');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Check if DSH web UI loads
    console.log('\n📋 Test 1: DSH Web UI accessible');
    await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    console.log(`✓ Page loaded: ${title}`);
    
    // Test 2: Check for Cordis tools in the UI
    console.log('\n📋 Test 2: Checking for Cordis tools');
    const toolCount = await page.locator('[data-testid="tool"], .tool, [class*="tool"]').count();
    console.log(`✓ Found ${toolCount} potential tool elements`);
    
    // Test 3: Test Hub API directly (bypass auth)
    console.log('\n📋 Test 3: Testing Hub API endpoints');
    const hubTests = [
      { name: 'Health', url: 'http://127.0.0.1:4100/health' },
      { name: 'Modes', url: 'http://127.0.0.1:4100/modes' },
      { name: 'Sessions', url: 'http://127.0.0.1:4100/sessions' },
      { name: 'Broadcasts', url: 'http://127.0.0.1:4100/broadcasts' },
      { name: 'Leases', url: 'http://127.0.0.1:4100/leases' },
    ];
    
    for (const test of hubTests) {
      try {
        const response = await fetch(test.url, {
          headers: { 'Authorization': 'Bearer dev-token' }
        });
        if (response.ok) {
          const data = await response.json();
          console.log(`✓ ${test.name}: OK (${Array.isArray(data) ? data.length : 'object'} items)`);
        } else {
          console.log(`⚠ ${test.name}: HTTP ${response.status}`);
        }
      } catch (e) {
        console.log(`✗ ${test.name}: ${e.message}`);
      }
    }
    
    // Test 4: Create a test mode via API
    console.log('\n📋 Test 4: Creating test mode');
    try {
      const createResponse = await fetch('http://127.0.0.1:4100/modes', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'playwright-test-mode',
          base_mode: 'dev',
          description: 'Test mode created by Playwright',
          model_route: '/test-route'
        })
      });
      
      if (createResponse.ok) {
        const mode = await createResponse.json();
        console.log(`✓ Created mode: ${mode.name} (${mode.id})`);
        
        // Test 5: Verify mode appears in list
        console.log('\n📋 Test 5: Verifying mode in list');
        const listResponse = await fetch('http://127.0.0.1:4100/modes', {
          headers: { 'Authorization': 'Bearer dev-token' }
        });
        const modes = await listResponse.json();
        const found = modes.find(m => m.name === 'playwright-test-mode');
        console.log(found ? `✓ Mode found in list` : `✗ Mode not found`);
      } else {
        console.log(`⚠ Mode creation failed: ${createResponse.status}`);
      }
    } catch (e) {
      console.log(`✗ Mode creation error: ${e.message}`);
    }
    
    // Test 6: Test lease checkout
    console.log('\n📋 Test 6: Testing lease management');
    try {
      const leaseResponse = await fetch('http://127.0.0.1:4100/leases', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'checkout',
          resource: '/playwright-test-resource',
          holder: 'test-session-123'
        })
      });
      
      if (leaseResponse.ok) {
        const lease = await leaseResponse.json();
        console.log(`✓ Lease checked out: ${lease.resource}`);
        
        // Verify lease is held
        const leases = await fetch('http://127.0.0.1:4100/leases', {
          headers: { 'Authorization': 'Bearer dev-token' }
        }).then(r => r.json());
        const found = leases.find(l => l.resource === '/playwright-test-resource');
        console.log(found ? `✓ Lease verified` : `✗ Lease not found`);
      }
    } catch (e) {
      console.log(`⚠ Lease test skipped: ${e.message}`);
    }
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testPlugins().catch(console.error);
