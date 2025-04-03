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

// Function to get stored message ID
async function getMessageId() {
  try {
    await fs.ensureDir(path.dirname(messageIdPath));
    if (await fs.pathExists(messageIdPath)) {
      const messageId = await fs.readFile(messageIdPath, 'utf8');
      return messageId.trim();
    }
    return null;
  } catch (error) {
    console.error('Error reading message ID:', error.message);
    return null;
  }
}

// Save message ID to file
async function saveMessageId(messageId) {
  try {
    await fs.ensureDir(path.dirname(messageIdPath));
    await fs.writeFile(messageIdPath, messageId);
    console.log(`Message ID ${messageId} saved to ${messageIdPath}`);
  } catch (error) {
    console.error('Error saving message ID:', error.message);
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
    
    // Get the stored message ID
    const messageId = await getMessageId();
    
    // Extract webhook ID and token from the URL
    const webhookIdMatch = webhookUrl.match(/\/webhooks\/(\d+)\/([^\/]+)/);
    if (!webhookIdMatch) {
      console.error('Invalid webhook URL format');
      return;
    }
    
    const webhookId = webhookIdMatch[1];
    const webhookToken = webhookIdMatch[2];
    
    if (messageId) {
      try {
        // Try to edit the existing message
        console.log(`Attempting to edit message ID: ${messageId}`);
        
        // Direct webhook message edit
        const editUrl = `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`;
        await axios.patch(editUrl, embed);
        
        console.log('Successfully edited the message!');
      } catch (error) {
        console.error('Error editing message:', error.message);
        console.log('Creating a new message instead...');
        
        // Create a new message if editing fails
        const response = await axios.post(webhookUrl, {
          ...embed,
          content: "VPS Status Monitor"
        });
        
        if (response.data && response.data.id) {
          await saveMessageId(response.data.id);
        }
      }
    } else {
      // No existing message ID, create a new one
      console.log('No previous message found. Creating a new message...');
      
      const response = await axios.post(webhookUrl, {
        ...embed,
        content: "VPS Status Monitor"
      });
      
      if (response.data && response.data.id) {
        await saveMessageId(response.data.id);
      }
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