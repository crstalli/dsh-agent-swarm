/**
 * Auto-Start Demo - Comprehensive
 * 
 * Demonstrates that the hub server auto-starts when DSH starts with
 * a profile that includes coord-core plugin, without touching main DSH.
 */

const config = require('./test-config');

async function demo() {
  console.log('🎬 DSH Agent Swarm - Auto-Start Demo');
  console.log('=====================================\n');
  
  // Step 1: Show current state
  console.log('Step 1: Current State');
  console.log('------------------------');
  console.log('Main DSH running on port 3080 (untouched)');
  console.log('Hub server should be auto-started via coord-core plugin\n');
  
  // Step 2: Verify hub is running
  console.log('Step 2: Verify Hub Auto-Started');
  console.log('-------------------------------');
  
  try {
    const health = await fetch(`${config.hubUrl}/health`).then(r => r.json());
    console.log(`✓ Hub responding at ${config.hubUrl}`);
    console.log(`✓ Port: ${health.port}`);
    console.log(`✓ Sessions tracked: ${health.sessions}`);
    console.log(`✓ Modes registered: ${health.modes || 'N/A'}\n`);
  } catch (e) {
    console.error(`✗ Hub not running: ${e.message}`);
    console.log('\nThis means the profile was started without coord-core plugin');
    console.log('or DSH needs to be restarted with the profile.\n');
    return;
  }
  
  // Step 3: Demonstrate functionality
  console.log('Step 3: Plugin Functionality Demo');
  console.log('-----------------------------------');
  
  // Test mode system
  const modes = await fetch(`${config.hubUrl}/modes`, {
    headers: { 'Authorization': `Bearer ${config.authToken}` }
  }).then(r => r.json());
  
  console.log(`Mode System: ${modes.length} modes found`);
  modes.slice(0, 3).forEach(m => 
    console.log(`  - ${m.name}`)
  );
  console.log('');
  
  // Test sessions
  const sessions = await fetch(`${config.hubUrl}/sessions`, {
    headers: { 'Authorization': `Bearer ${config.authToken}` }
  }).then(r => r.json());
  
  console.log(`Session Store: ${sessions.length} sessions tracked\n`);
  
  // Step 4: Create something new
  console.log('Step 4: Creating New Mode (Live)');
  console.log('----------------------------------');
  
  const testMode = `demo-${Date.now()}`;
  const createRes = await fetch(`${config.hubUrl}/modes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: testMode,
      base_mode: 'dev',
      description: 'Auto-created via demo'
    })
  });
  
  if (createRes.ok) {
    const mode = await createRes.json();
    console.log(`✓ Created mode: ${mode.name}`);
    console.log(`✓ Mode ID: ${mode.id}\n`);
  }
  
  // Step 5: Show integration with different profiles
  console.log('Step 5: Profile Isolation');
  console.log('------------------------');
  console.log('You can test with different profiles without touching main DSH:\n');
  console.log('  # Test pwtest profile (port 3083)');
  console.log('  DSH_PORT=3083 DSH_PROFILE=pwtest node demo-auto-start.js\n');
  console.log('  # Test fresh profile (port 3090)');
  console.log('  DSH_PORT=3090 DSH_HUB_PORT=4101 node demo-auto-start.js\n');
  
  // Final summary
  console.log('=====================================');
  console.log('✅ Auto-Start Working!');
  console.log('=====================================\n');
  
  console.log('Key Points:');
  console.log('• Hub server auto-starts when DSH starts with coord-core plugin');
  console.log('• No manual server management required');
  console.log('• Environment variables configure ports/profiles');
  console.log('• Main DSH on port 3080 never disturbed');
  console.log('• Full API available immediately at :4100');
  console.log('');
  console.log('Run: node tests/demo-auto-start.js');
  console.log('To see it in action!');
}

demo().catch(console.error);
