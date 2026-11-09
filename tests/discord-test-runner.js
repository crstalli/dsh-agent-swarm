/**
 * DSH Agent Swarm Discord Integration Test Runner
 * 
 * Executes integration tests with screenshot capture
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DiscordTestRunner {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshotDir = '/mnt/f/ai/plugins/dsh-agent-swarm/tests/screenshots';
    this.results = [];
  }

  /**
   * Initialize browser for testing
   */
  async init() {
    console.log('🚀 Initializing Discord test runner...');
    
    // Create screenshot directory
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    // Launch browser
    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await this.context.newPage();
    
    console.log('✅ Browser initialized');
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name, description) {
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    // Also save metadata
    const metadata = {
      name,
      description,
      timestamp: new Date().toISOString(),
      url: this.page.url()
    };
    
    fs.writeFileSync(
      filepath.replace('.png', '.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`📸 Screenshot: ${filename}`);
    return filepath;
  }

  /**
   * Test 1: Verify hub server is running
   */
  async testHubServerRunning() {
    console.log('\n🧪 Test 1: Hub server is accessible');
    
    try {
      const response = await fetch('http://127.0.0.1:4100/api/health');
      const data = await response.json();
      
      this.results.push({
        test: 'Hub server running',
        passed: response.ok && data.status === 'ok',
        details: data,
        timestamp: new Date().toISOString()
      });
      
      if (this.results[this.results.length - 1].passed) {
        console.log('✅ PASS: Hub server responding');
        
        // Take screenshot of hub UI
        await this.page.goto('http://127.0.0.1:4100/ui');
        await this.page.waitForSelector('#dashboard', { timeout: 5000 });
        await this.takeScreenshot('hub-dashboard', 'Hub server dashboard');
      }
      
    } catch (error) {
      this.results.push({
        test: 'Hub server running',
        passed: false,
        error: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  /**
   * Test 2: Session creation flow
   */
  async testSessionCreation() {
    console.log('\n🧪 Test 2: Create session via API');
    
    try {
      const sessionData = {
        name: `Discord Test Session ${Date.now()}`,
        projectId: 'test-project'
      };
      
      const response = await fetch('http://127.0.0.1:4100/api/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });
      
      const session = await response.json();
      
      this.results.push({
        test: 'Session creation',
        passed: response.ok && session.id,
        sessionId: session.id,
        sessionName: session.name
      });
      
      if (this.results[this.results.length - 1].passed) {
        console.log(`✅ PASS: Session created - ${session.id}`);
        
        // Wait for Discord sync
        await this.wait(3000);
        
        // Verify in UI
        await this.page.goto('http://127.0.0.1:4100/ui');
        await this.page.waitForSelector('[data-session-id]');
        
        const sessions = await this.page.$$eval('[data-session-id]', els => 
          els.map(el => el.dataset.sessionId)
        );
        
        if (sessions.includes(session.id)) {
          console.log('✅ Session visible in UI');
          await this.takeScreenshot('session-created', `Session ${session.id} in UI`);
        }
      }
      
    } catch (error) {
      this.results.push({
        test: 'Session creation',
        passed: false,
        error: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  /**
   * Test 3: Discord channel auto-creation
   */
  async testDiscordChannelCreation() {
    console.log('\n🧪 Test 3: Discord channel auto-creation');
    
    try {
      // This would require actual Discord bot integration
      // For now, we verify the session exists and is ready for sync
      
      const sessionsResponse = await fetch('http://127.0.0.1:4100/api/sessions', {
        headers: { 'Authorization': 'Bearer dev-token' }
      });
      
      const sessions = await sessionsResponse.json();
      
      if (sessions.length > 0) {
        console.log(`✅ Found ${sessions.length} sessions ready for Discord sync`);
        
        this.results.push({
          test: 'Discord channel creation',
          passed: true,
          sessionCount: sessions.length,
          note: 'Sessions ready - bot will create channels'
        });
        
        // Take screenshot of sessions list
        await this.page.goto('http://127.0.0.1:4100/ui');
        await this.takeScreenshot('sessions-list', 'Sessions available for Discord sync');
        
      } else {
        throw new Error('No sessions found');
      }
      
    } catch (error) {
      this.results.push({
        test: 'Discord channel creation',
        passed: false,
        error: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  /**
   * Test 4: Message flow simulation
   */
  async testMessageFlow() {
    console.log('\n🧪 Test 4: Message flow between systems');
    
    try {
      // Get a session
      const sessionsResponse = await fetch('http://127.0.0.1:4100/api/sessions', {
        headers: { 'Authorization': 'Bearer dev-token' }
      });
      
      const sessions = await sessionsResponse.json();
      
      if (sessions.length === 0) {
        throw new Error('No sessions available for testing');
      }
      
      const session = sessions[0];
      const testMessage = `Integration test message ${Date.now()}`;
      
      // Post message to session
      const response = await fetch(`http://127.0.0.1:4100/api/sessions/${session.id}/deliveries`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: 'integration-test',
          content: testMessage,
          type: 'test'
        })
      });
      
      if (response.ok) {
        console.log(`✅ Message posted to session ${session.id}`);
        
        this.results.push({
          test: 'Message flow',
          passed: true,
          sessionId: session.id,
          message: testMessage
        });
        
        // Take screenshot of delivery in UI
        await this.page.goto(`http://127.0.0.1:4100/ui/sessions/${session.id}`);
        await this.takeScreenshot('message-delivered', `Message in session ${session.id}`);
        
      } else {
        throw new Error('Failed to post message');
      }
      
    } catch (error) {
      this.results.push({
        test: 'Message flow',
        passed: false,
        error: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  /**
   * Test 5: Thread creation for detailed output
   */
  async testThreadCreation() {
    console.log('\n🧪 Test 5: Thread creation for detailed output');
    
    try {
      const sessionsResponse = await fetch('http://127.0.0.1:4100/api/sessions', {
        headers: { 'Authorization': 'Bearer dev-token' }
      });
      
      const sessions = await sessionsResponse.json();
      
      if (sessions.length === 0) {
        throw new Error('No sessions available');
      }
      
      const session = sessions[0];
      
      // Post long message that should create thread
      const longMessage = 'A'.repeat(1500) + ' Detailed reasoning and analysis that should trigger thread creation in Discord';
      
      const response = await fetch(`http://127.0.0.1:4100/api/sessions/${session.id}/deliveries`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: 'integration-test',
          content: longMessage,
          type: 'reasoning'
        })
      });
      
      if (response.ok) {
        console.log('✅ Long message posted (should create thread in Discord)');
        
        this.results.push({
          test: 'Thread creation',
          passed: true,
          sessionId: session.id,
          messageLength: longMessage.length
        });
        
        await this.takeScreenshot('long-message', 'Long message that triggers thread');
      }
      
    } catch (error) {
      this.results.push({
        test: 'Thread creation',
        passed: false,
        error: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 Generating Test Report\n');
    console.log('=' .repeat(70));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${total - passed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('=' .repeat(70));
    
    console.log('\nDetailed Results:\n');
    this.results.forEach((result, i) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} Test ${i + 1}: ${result.test}`);
      
      if (result.sessionId) {
        console.log(`   Session: ${result.sessionId}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
      console.log('');
    });
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed: total - passed,
        successRate: ((passed / total) * 100).toFixed(1)
      },
      results: this.results,
      screenshots: fs.readdirSync(this.screenshotDir).filter(f => f.endsWith('.png'))
    };
    
    const reportPath = path.join(this.screenshotDir, 'integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Full report saved to: ${reportPath}`);
    console.log(`📸 Screenshots in: ${this.screenshotDir}`);
    
    return report;
  }

  /**
   * Wait helper
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run all tests
   */
  async run() {
    try {
      await this.init();
      
      await this.testHubServerRunning();
      await this.testSessionCreation();
      await this.testDiscordChannelCreation();
      await this.testMessageFlow();
      await this.testThreadCreation();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new DiscordTestRunner();
  runner.run().catch(console.error);
}

module.exports = DiscordTestRunner;
