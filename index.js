require('dotenv').config();
const axios = require('axios');
const { getSystemInformation } = require('./systemInfo');

// Get environment variables
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const channelId = process.env.DISCORD_CHANNEL_ID;
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || '10');

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
    };
    
    // Send the embed to Discord webhook
    console.log('Sending status to Discord...');
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
    
    console.log('Status sent successfully!');
  } catch (error) {
    console.error('Error sending status to Discord:', error.message);
  }
}

// Initial status update
sendVpsStatusToDiscord();

// Schedule regular updates
const intervalMs = updateInterval * 60 * 1000;
setInterval(sendVpsStatusToDiscord, intervalMs);

console.log(`VPS monitoring started. Sending updates every ${updateInterval} minutes.`);
console.log('Press Ctrl+C to stop the monitoring.'); 