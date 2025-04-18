require('dotenv').config();
const axios = require('axios');
const { getSystemInformation } = require('./systemInfo');
const fs = require('fs-extra');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Get environment variables
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const channelId = process.env.DISCORD_CHANNEL_ID;
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || '10');

// Path to store the message ID
const messageIdPath = path.join(__dirname, 'data', 'message_id.txt');

// Validate environment variables
if (!webhookUrl || !channelId) {
  console.error('Missing required environment variables (DISCORD_WEBHOOK_URL or DISCORD_CHANNEL_ID)');
  console.log('Please run the setup script: npm run setup');
  process.exit(1);
}

// Color for the Discord embed
const COLORS = {
  GOOD: 0x00ff00, // Green
  WARNING: 0xffff00, // Yellow
  DANGER: 0xff0000 // Red
};

// Create data directory immediately at startup
(async () => {
  try {
    await fs.ensureDir(path.dirname(messageIdPath));
    console.log(`Data directory created/verified at ${path.dirname(messageIdPath)}`);
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
})();

// Function to get stored message ID
function getMessageId() {
  try {
    if (fs.existsSync(messageIdPath)) {
      const messageId = fs.readFileSync(messageIdPath, 'utf8');
      console.log(`Using message ID from file: ${messageId}`);
      return messageId.trim();
    } else {
      console.error('Error: Message ID file not found. Please run the install script again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error reading message ID:', error.message);
    process.exit(1);
  }
}

async function sendVpsStatusToDiscord() {
  try {
    console.log('Collecting system information...');
    const sysInfo = await getSystemInformation();
    
    // Determine status color based on resource usage
    let statusColor = COLORS.GOOD;
    const memUsagePercent = parseFloat(sysInfo.memory.usedPercent);
    const diskUsagePercent = parseFloat(sysInfo.disk.usedPercent);
    
    if (memUsagePercent > 90 || diskUsagePercent > 90) {
      statusColor = COLORS.DANGER;
    } else if (memUsagePercent > 70 || diskUsagePercent > 70) {
      statusColor = COLORS.WARNING;
    }
    
    // Create Discord embed
    const embed = {
      embeds: [{
        title: `VPS Status: ${sysInfo.hostname}`,
        color: statusColor,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: '📊 System',
            value: [
              `**OS**: ${sysInfo.osInfo.distro} ${sysInfo.osInfo.release} (${sysInfo.osInfo.arch})`,
              `**Kernel**: ${sysInfo.osInfo.kernel}`,
              `**Uptime**: ${sysInfo.uptime}`
            ].join('\n'),
            inline: false
          },
          {
            name: '🔧 CPU',
            value: [
              `**Model**: ${sysInfo.cpu.brand}`,
              `**Cores**: ${sysInfo.cpu.physicalCores} physical / ${sysInfo.cpu.cores} logical`,
              `**Speed**: ${sysInfo.cpu.speed} GHz`,
              `**Usage**: ${sysInfo.cpu.usage.toFixed(2)}%`
            ].join('\n'),
            inline: true
          },
          {
            name: '💾 Memory',
            value: [
              `**Total**: ${sysInfo.memory.total} GB`,
              `**Used**: ${sysInfo.memory.used} GB (${sysInfo.memory.usedPercent}%)`,
              `**Free**: ${sysInfo.memory.free} GB`
            ].join('\n'),
            inline: true
          },
          {
            name: '💿 Disk',
            value: [
              `**Total**: ${sysInfo.disk.total} GB`,
              `**Used**: ${sysInfo.disk.used} GB (${sysInfo.disk.usedPercent}%)`,
              `**Free**: ${sysInfo.disk.free} GB`
            ].join('\n'),
            inline: true
          },
          {
            name: '🌐 Network',
            value: [
              `**Internal IP**: ${sysInfo.network.internalIp}`,
              `**External IP**: ${sysInfo.network.externalIp}`
            ].join('\n'),
            inline: false
          }
        ],
        footer: {
          text: `Last updated • Next update in ${updateInterval} minutes`
        }
      }]
    };
    
    // Get the message ID
    const messageId = getMessageId();
    
    // Extract webhook ID and token from the URL
    const webhookIdMatch = webhookUrl.match(/\/webhooks\/(\d+)\/([^\/]+)/);
    if (!webhookIdMatch) {
      console.error('Invalid webhook URL format');
      return;
    }
    
    const webhookId = webhookIdMatch[1];
    const webhookToken = webhookIdMatch[2];
    
    // Update the existing message
    try {
      console.log(`Updating message ID: ${messageId}...`);
      
      // Direct webhook message edit
      const editUrl = `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`;
      await axios.patch(editUrl, embed);
      
      console.log('Message updated successfully!');
    } catch (error) {
      console.error('Error updating message:', error.message);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
      
      console.log('Please run the install script again to create a new message and update the message ID.');
    }
  } catch (error) {
    console.error('Error in sendVpsStatusToDiscord:', error.message);
  }
}

// Initial status update
sendVpsStatusToDiscord();

// Schedule regular updates
const intervalMs = updateInterval * 60 * 1000;
setInterval(sendVpsStatusToDiscord, intervalMs);

console.log(`VPS monitoring started. Sending updates every ${updateInterval} minutes.`);
console.log('Running in background mode. Press Ctrl+C to stop the monitoring.'); 