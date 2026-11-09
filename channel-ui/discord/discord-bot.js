/**
 * DSH Agent Swarm - Discord Bridge Bot
 * 
 * Syncs DSH sessions to Discord channels in real-time
 * 
 * Features:
 * - Auto-create Discord channels for new DSH sessions
 * - Auto-delete channels when sessions are archived
 * - Mirror messages between Discord and DSH sessions
 * - Use threads for detailed reasoning/output
 * - Real-time sync with hub server
 */

const { Client, GatewayIntentBits, Partials, ChannelType, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  HUB_URL: process.env.DSH_COORD_HUB_URL || 'http://127.0.0.1:4100',
  HUB_TOKEN: process.env.DSH_COORD_HUB_TOKEN || 'dev-token',
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_CHANNEL_CATEGORY_ID: process.env.DISCORD_CHANNEL_CATEGORY_ID,
  POLL_INTERVAL: 3000, // 3 seconds
  BOT_PREFIX: '!',
};

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// State management
const sessionChannelMap = new Map(); // sessionId -> channelId
const channelSessionMap = new Map(); // channelId -> sessionId
const pendingMessages = new Map(); // messageId -> {sessionId, processed}

// Initialize bot
async function initialize() {
  console.log('🤖 DSH Agent Swarm Discord Bridge Starting...');
  
  // Login to Discord
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
  
  await client.login(token);
  console.log('✅ Connected to Discord');
  
  // Load existing sessions and sync channels
  await syncAllSessions();
  
  // Start polling for changes
  startPolling();
  
  console.log('🎯 Discord bridge ready!');
}

// Sync all sessions with Discord channels
async function syncAllSessions() {
  console.log('🔄 Syncing all sessions with Discord channels...');
  
  try {
    const sessions = await fetchSessions();
    
    for (const session of sessions) {
      await ensureChannelForSession(session);
    }
    
    // Clean up orphaned channels
    await cleanupOrphanedChannels(sessions);
    
    console.log(`✅ Synced ${sessions.length} sessions`);
  } catch (error) {
    console.error('❌ Error syncing sessions:', error);
  }
}

// Fetch sessions from hub
async function fetchSessions() {
  const response = await fetch(`${CONFIG.HUB_URL}/api/sessions`, {
    headers: { 'Authorization': `Bearer ${CONFIG.HUB_TOKEN}` }
  });
  
  if (!response.ok) {
    throw new Error(`Hub API error: ${response.status}`);
  }
  
  return await response.json();
}

// Ensure Discord channel exists for a session
async function ensureChannelForSession(session) {
  const existingChannelId = sessionChannelMap.get(session.id);
  
  if (existingChannelId) {
    // Channel exists, verify it's still valid
    const channel = client.channels.cache.get(existingChannelId);
    if (!channel) {
      console.log(`📝 Channel ${existingChannelId} not found in cache, recreating...`);
      await createChannelForSession(session);
    }
    return;
  }
  
  // Create new channel for this session
  await createChannelForSession(session);
}

// Create Discord channel for a session
async function createChannelForSession(session) {
  try {
    const guild = client.guilds.cache.get(CONFIG.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error(`Guild ${CONFIG.DISCORD_GUILD_ID} not found`);
    }
    
    // Sanitize session name for channel name
    const channelName = sanitizeChannelName(session.name || session.id);
    
    // Create text channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CONFIG.DISCORD_CHANNEL_CATEGORY_ID,
      topic: `DSH Session: ${session.id}`,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
    
    // Store mapping
    sessionChannelMap.set(session.id, channel.id);
    channelSessionMap.set(channel.id, session.id);
    
    console.log(`✅ Created channel #${channel.name} for session ${session.id}`);
    
    // Post initial system message
    await postSystemMessage(channel.id, {
      type: 'session_created',
      sessionId: session.id,
      sessionName: session.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error creating channel for session ${session.id}:`, error);
  }
}

// Delete Discord channel when session is archived/removed
async function deleteChannelForSession(sessionId) {
  const channelId = sessionChannelMap.get(sessionId);
  if (!channelId) return;
  
  try {
    const channel = client.channels.cache.get(channelId);
    if (channel) {
      await channel.delete();
      console.log(`🗑️ Deleted channel for session ${sessionId}`);
    }
    
    sessionChannelMap.delete(sessionId);
    channelSessionMap.delete(channelId);
  } catch (error) {
    console.error(`❌ Error deleting channel for session ${sessionId}:`, error);
  }
}

// Handle new message from Discord -> DSH session
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Ignore commands
  if (message.content.startsWith(CONFIG.BOT_PREFIX)) return;
  
  // Check if this is a session channel
  const sessionId = channelSessionMap.get(message.channel.id);
  if (!sessionId) return;
  
  // Don't process the same message twice
  if (pendingMessages.has(message.id)) return;
  
  pendingMessages.set(message.id, { sessionId, processed: true });
  
  try {
    console.log(`📥 Discord → DSH: ${message.author.tag} in #${message.channel.name}`);
    
    // Extract content
    let content = message.content;
    let attachments = [];
    
    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        attachments.push({
          url: attachment.url,
          filename: attachment.name
        });
      }
    }
    
    // Handle thread messages differently
    if (message.channel.parentId && message.channel.type === ChannelType.GuildText) {
      const parentChannelId = message.channel.parentId;
      const parentSessionId = channelSessionMap.get(parentChannelId);
      
      if (parentSessionId) {
        // This is a thread - post as reasoning/detail
        await postToSessionAsReasoning(parentSessionId, {
          user: message.author.tag,
          content,
          attachments,
          threadName: message.channel.name,
          messageId: message.id
        });
        return;
      }
    }
    
    // Post to DSH session
    await postToSession(sessionId, {
      user: message.author.tag,
      userId: message.author.id,
      content,
      attachments,
      discordMessageId: message.id,
      timestamp: message.createdTimestamp
    });
    
  } catch (error) {
    console.error('❌ Error processing Discord message:', error);
  }
});

// Handle new messages from DSH -> Discord
async function handleSessionUpdate(sessionId, delivery) {
  const channelId = sessionChannelMap.get(sessionId);
  if (!channelId) return;
  
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;
  
  try {
    // Format message for Discord
    const formattedMessage = formatDeliveryForDiscord(delivery);
    
    // Check if message is too long or has detailed reasoning
    if (shouldUseThread(formattedMessage)) {
      await postToDiscordThread(channel, formattedMessage, delivery);
    } else {
      await channel.send({
        content: formattedMessage.content,
        embeds: formattedMessage.embeds
      });
    }
    
  } catch (error) {
    console.error('❌ Error posting to Discord:', error);
  }
}

// Post system messages to Discord
async function postSystemMessage(channelId, data) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;
  
  const embed = {
    color: 0x007acc,
    title: '🤖 System Message',
    description: formatSystemMessage(data),
    timestamp: new Date().toISOString()
  };
  
  await channel.send({ embeds: [embed] });
}

// Format delivery for Discord display
function formatDeliveryForDiscord(delivery) {
  // Check if this is reasoning/thinking output
  if (delivery.type === 'reasoning' || delivery.content.includes('thinking') || delivery.content.length > 2000) {
    return {
      content: `🧠 **Agent Reasoning**\n\n${delivery.content.substring(0, 500)}${delivery.content.length > 500 ? '...' : ''}`,
      embeds: [],
      useThread: true
    };
  }
  
  // Regular message
  return {
    content: `🤖 **Agent**\n\n${delivery.content}`,
    embeds: []
  };
}

// Determine if message should go to a thread
function shouldUseThread(message) {
  return message.content && (
    message.content.length > 1000 ||
    message.content.includes('reasoning') ||
    message.content.includes('thinking')
  );
}

// Post detailed message to thread
async function postToDiscordThread(parentChannel, formattedMessage, delivery) {
  const thread = await parentChannel.threads.create({
    name: `Reasoning ${new Date().toLocaleTimeString()}`,
    autoArchiveDuration: 60,
    reason: 'Detailed agent output'
  });
  
  await thread.send({
    content: formattedMessage.content,
    embeds: formattedMessage.embeds
  });
  
  console.log(`🧵 Posted to thread in #${parentChannel.name}`);
}

// Post to DSH session via API
async function postToSession(sessionId, data) {
  const response = await fetch(`${CONFIG.HUB_URL}/api/sessions/${sessionId}/deliveries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.HUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user: data.user,
      content: data.content,
      attachments: data.attachments,
      source: 'discord',
      discordMessageId: data.discordMessageId,
      timestamp: data.timestamp
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to post to session: ${response.status}`);
  }
}

// Post reasoning to DSH as separate delivery
async function postToSessionAsReasoning(sessionId, data) {
  await postToSession(sessionId, {
    user: `${data.user} (thread: ${data.threadName})`,
    content: `Thread discussion:\n\n${data.content}`,
    attachments: data.attachments,
    metadata: {
      type: 'thread_reasoning',
      threadName: data.threadName,
      discordMessageId: data.messageId
    }
  });
}

// Poll for changes from hub
function startPolling() {
  setInterval(async () => {
    try {
      const sessions = await fetchSessions();
      const currentSessionIds = new Set(sessions.map(s => s.id));
      
      // Check for new or updated sessions
      for (const session of sessions) {
        await ensureChannelForSession(session);
        
        // Check for new deliveries in session
        await checkSessionForNewDeliveries(session);
      }
      
      // Check for deleted sessions
      for (const [sessionId] of sessionChannelMap) {
        if (!currentSessionIds.has(sessionId)) {
          await deleteChannelForSession(sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }, CONFIG.POLL_INTERVAL);
}

// Check session for new deliveries
async function checkSessionForNewDeliveries(session) {
  try {
    const response = await fetch(`${CONFIG.HUB_URL}/api/sessions/${session.id}/deliveries?since=${Date.now() - 10000}`, {
      headers: { 'Authorization': `Bearer ${CONFIG.HUB_TOKEN}` }
    });
    
    if (response.ok) {
      const deliveries = await response.json();
      for (const delivery of deliveries) {
        await handleSessionUpdate(session.id, delivery);
      }
    }
  } catch (error) {
    // Session might not have deliveries endpoint, ignore
  }
}

// Utility: Sanitize channel name
function sanitizeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 90);
}

// Utility: Format system message
function formatSystemMessage(data) {
  switch (data.type) {
    case 'session_created':
      return `Session **${data.sessionName}** (${data.sessionId}) has been created and synced to Discord.`;
    case 'session_updated':
      return `Session **${data.sessionName}** has been updated.`;
    case 'session_archived':
      return `Session **${data.sessionName}** has been archived. Channel will be removed.`;
    default:
      return `System update for session ${data.sessionId}`;
  }
}

// Bot ready event
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📊 Monitoring guild: ${CONFIG.DISCORD_GUILD_ID}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// Start the bot
initialize().catch(console.error);

module.exports = { client, initialize };
