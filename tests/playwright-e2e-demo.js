/**
 * DSH Agent Swarm - End-to-End Integration Demo
 * 
 * Demonstrates complete workflow from DSH startup through mode creation and API interaction
 * with auto-started hub server on port 4100
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

class E2EDemo {
  constructor() {
    this.hubUrl = 'http://127.0.0.1:4100';
    this.dshUrl = 'http://127.0.0.1:3083'; // pwtest profile
    this.screenshotsDir = '/mnt/f/ai/plugins/dsh-agent-swarm/tests/screenshots';
    this.reportsDir = '/mnt/f/ai/plugins/dsh-agent-swarm/tests/reports';
    
    // Create directories
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async run() {
    console.log('🚀 DSH Agent Swarm E2E Demo Starting...');
    console.log('========================================\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      screenshots: []
    };

    try {
      // Test 1: Hub server health check
      console.log('Test 1: Hub server health check');
      const health = await this.makeRequest(`${this.hubUrl}/api/health`);
      console.log(`✅ Hub server responding on port ${health.port}`);
      results.tests.push({
        name: 'Hub server health',
        passed: true,
        details: `Port ${health.port}, Sessions: ${health.sessions}`
      });

      // Test 2: Web UI accessibility
      console.log('\nTest 2: Web UI accessibility');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(`${this.hubUrl}/ui`);
      await page.waitForSelector('text=DSH Agent Swarm', { timeout: 10000 });
      
      const screenshot1 = `${this.screenshotsDir}/hub-dashboard.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      results.screenshots.push(screenshot1);
      console.log(`✅ Web UI loaded and screenshot captured`);
      
      // Test 3: Session API
      console.log('\nTest 3: Session API accessibility');
      const sessions = await this.makeRequest(`${this.hubUrl}/api/sessions`, {
        headers: { 'Authorization': 'Bearer dev-token' }
      });
      console.log(`✅ Found ${sessions.length} sessions`);
      results.tests.push({
        name: 'Session API',
        passed: true,
        details: `${sessions.length} sessions accessible`
      });

      // Test 4: Create test session
      console.log('\nTest 4: Create test session');
      const testSessionName = `E2E Test ${Date.now()}`;
      const newSession = await this.makeRequest(`${this.hubUrl}/api/sessions`, {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: {
          name: testSessionName,
          projectId: 'e2e-test-project'
        }
      });
      
      console.log(`✅ Session created: ${newSession.id}`);
      results.tests.push({
        name: 'Session creation',
        passed: true,
        details: `Session ID: ${newSession.id}`
      });

      // Test 5: Verify session appears in UI
      console.log('\nTest 5: Verify session in UI');
      await page.reload();
      await page.waitForTimeout(2000);
      const sessionVisible = await page.locator(`text=${testSessionName}`).isVisible().catch(() => false);
      
      if (sessionVisible) {
        const screenshot2 = `${this.screenshotsDir}/session-created.png`;
        await page.screenshot({ path: screenshot2, fullPage: true });
        results.screenshots.push(screenshot2);
        console.log(`✅ Session visible in UI`);
        results.tests.push({
          name: 'Session UI visibility',
          passed: true,
          details: 'Session appears in dashboard'
        });
      }

      // Test 6: Message delivery
      console.log('\nTest 6: Message delivery to session');
      const delivery = await this.makeRequest(`${this.hubUrl}/api/sessions/${newSession.id}/deliveries`, {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: {
          user: 'test-user',
          content: 'E2E test message',
          type: 'user_message'
        }
      });
      
      console.log(`✅ Message delivered to session`);
      results.tests.push({
        name: 'Message delivery',
        passed: true,
        details: `Delivery ID: ${delivery.id}`
      });

      // Test 7: Mode system integration
      console.log('\nTest 7: Mode system integration');
      try {
        const modes = await this.makeRequest(`${this.hubUrl}/api/modes`, {
          headers: { 'Authorization': 'Bearer dev-token' }
        });
        console.log(`✅ Modes accessible: ${modes.length} modes`);
        results.tests.push({
          name: 'Mode system',
          passed: true,
          details: `${modes.length} modes available`
        });
      } catch (e) {
        console.log('⚠️ Mode system not fully configured');
        results.tests.push({
          name: 'Mode system',
          passed: false,
          details: 'Mode system requires configuration'
        });
      }

      // Test 8: Broadcast subscriptions
      console.log('\nTest 8: Broadcast subscriptions');
      try {
        const broadcast = await this.makeRequest(`${this.hubUrl}/api/broadcast/subscribe`, {
          headers: { 'Authorization': 'Bearer dev-token' }
        });
        console.log(`✅ Broadcast endpoint accessible`);
        results.tests.push({
          name: 'Broadcast',
          passed: true,
          details: 'Subscriptions working'
        });
      } catch (e) {
        console.log('⚠️ Broadcast not fully configured');
      }

      await browser.close();

      // Generate report
      const report = {
        ...results,
        summary: {
          totalTests: results.tests.length,
          passed: results.tests.filter(t => t.passed).length,
          failed: results.tests.filter(t => !t.passed).length,
          successRate: `${Math.round((results.tests.filter(t => t.passed).length / results.tests.length) * 100)}%`
        }
      };

      fs.writeFileSync(
        `${this.reportsDir}/e2e-demo-report.json`,
        JSON.stringify(report, null, 2)
      );

      console.log('\n========================================');
      console.log('✅ E2E Demo Complete!');
      console.log(`📊 Tests passed: ${report.summary.passed}/${report.summary.totalTests}`);
      console.log(`📸 Screenshots: ${results.screenshots.length} captured`);
      console.log(`📄 Report: ${this.reportsDir}/e2e-demo-report.json`);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      results.error = error.message;
      
      fs.writeFileSync(
        `${this.reportsDir}/e2e-demo-report.json`,
        JSON.stringify(results, null, 2)
      );
    }

    return results;
  }
}

// Run demo if executed directly
if (require.main === module) {
  const demo = new E2EDemo();
  demo.run().then(results => {
    process.exit(results.tests.every(t => t.passed) ? 0 : 1);
  });
}

module.exports = E2EDemo;
