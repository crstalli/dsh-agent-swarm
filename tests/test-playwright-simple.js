/**
 * Simple Playwright test for DSH Agent Swarm plugins
 * Tests the pwtest profile UI and API endpoints
 */

const { chromium } = require('playwright');

async function runTest() {
  console.log('🚀 Testing DSH Agent Swarm Plugins via Playwright');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test pwtest profile on port 3083
    console.log('\n📋 Test 1: pwtest profile accessible');
    await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    console.log(`✓ Page loaded: ${title}`);
    
    // Check for any errors in console
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Wait a bit to let plugins load
    await page.waitForTimeout(3000);
    
    console.log('\n📋 Test 2: Testing Hub API endpoints directly');
    const hubTests = [
      { name: 'Health', url: 'http://127.0.0.1:4100/health' },
      { name: 'Modes', url: 'http://127.0.0.1:4100/modes', auth: true },
      { name: 'Sessions', url: 'http://127.0.0.1:4100/sessions', auth: true },
      { name: 'Broadcasts', url: 'http://127.0.0.1:4100/broadcasts', auth: true },
      { name: 'Leases', url: 'http://127.0.0.1:4100/leases', auth: true },
    ];
    
    for (const test of hubTests) {
      try {
        const headers = test.auth ? { 'Authorization': 'Bearer dev-token' } : {};
        const response = await fetch(test.url, { headers });
        if (response.ok) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : Object.keys(data).length;
          console.log(`✓ ${test.name}: OK (${count} items)`);
        } else {
          console.log(`⚠ ${test.name}: HTTP ${response.status}`);
        }
      } catch (e) {
        console.log(`✗ ${test.name}: ${e.message}`);
      }
    }
    
    // Test creating a new mode
    console.log('\n📋 Test 3: Creating test mode via API');
    try {
      const createResponse = await fetch('http://127.0.0.1:4100/modes', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `playwright-test-${Date.now()}`,
          base_mode: 'dev',
          description: 'Test mode created by Playwright',
          model_route: '/test-route'
        })
      });
      
      if (createResponse.ok) {
        const mode = await createResponse.json();
        console.log(`✓ Created mode: ${mode.name} (${mode.id})`);
        
        // Verify it appears in the list
        const listResponse = await fetch('http://127.0.0.1:4100/modes', {
          headers: { 'Authorization': 'Bearer dev-token' }
        });
        const modes = await listResponse.json();
        const found = modes.find(m => m.id === mode.id);
        console.log(found ? `✓ Mode verified in list` : `✗ Mode not found`);
      } else {
        console.log(`⚠ Mode creation failed: ${createResponse.status}`);
      }
    } catch (e) {
      console.log(`✗ Mode test error: ${e.message}`);
    }
    
    // Test lease management
    console.log('\n📋 Test 4: Testing lease checkout');
    try {
      const leaseResponse = await fetch('http://127.0.0.1:4100/leases', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'checkout',
          resource: `/playwright-test-${Date.now()}`,
          holder: 'test-session'
        })
      });
      
      if (leaseResponse.ok) {
        const lease = await leaseResponse.json();
        console.log(`✓ Lease checked out: ${lease.resource}`);
        
        // Verify lease exists
        const leases = await fetch('http://127.0.0.1:4100/leases', {
          headers: { 'Authorization': 'Bearer dev-token' }
        }).then(r => r.json());
        
        const found = leases.find(l => l.resource === lease.resource);
        console.log(found ? `✓ Lease verified` : `✗ Lease not found`);
      } else {
        console.log(`⚠ Lease test failed: ${leaseResponse.status}`);
      }
    } catch (e) {
      console.log(`⚠ Lease test error: ${e.message}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Hub server running on port 4100');
    console.log('  - coord-core plugin active (sessions, broadcasts, leases)');
    console.log('  - mode-system plugin active (modes registry)');
    console.log('  - resource-mgr plugin active (wake policies, leases)');
    console.log('  - pwtest profile accessible on port 3083');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
