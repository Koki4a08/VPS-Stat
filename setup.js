const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const readline = require('readline');

const configPath = path.join(__dirname, '.env');

async function downloadFile(url, destination) {
  console.log(`Downloading ${url} to ${destination}...`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'text'
    });
    
    await fs.writeFile(destination, response.data);
    console.log(`Successfully downloaded ${destination}`);
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    throw error;
  }
}

async function setupVpsBot() {
  console.log('==== VPS-Stat Setup ====');
  
  try {
    console.log('Checking dependencies...');
    
    await fs.ensureDir(path.join(__dirname, 'data'));
    
    console.log('\n------------------------------------------');
    console.log('Please enter your Discord webhook information:');
    console.log('------------------------------------------\n');
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Promise wrapper for readline question
    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    // Get webhook URL with validation
    let webhookUrl = '';
    let validWebhook = false;
    while (!validWebhook) {
      webhookUrl = await question('Enter your Discord webhook URL: ');
      if (!webhookUrl) {
        console.log('Webhook URL is required');
      } else if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        console.log('Invalid webhook URL format. It should start with https://discord.com/api/webhooks/');
      } else {
        validWebhook = true;
      }
    }

    // Get channel ID with validation
    let channelId = '';
    let validChannel = false;
    while (!validChannel) {
      channelId = await question('Enter your Discord channel ID: ');
      if (!channelId) {
        console.log('Channel ID is required');
      } else if (!/^\d+$/.test(channelId)) {
        console.log('Invalid channel ID. It should contain only numbers.');
      } else {
        validChannel = true;
      }
    }

    // Get update interval with validation
    let updateInterval = await question('Enter update interval in minutes (default: 10): ');
    if (!updateInterval) {
      updateInterval = '10';
    } else {
      const num = parseInt(updateInterval);
      if (isNaN(num) || num <= 0) {
        console.log('Invalid number, using default (10)');
        updateInterval = '10';
      }
    }

    // Close readline interface
    rl.close();

    const envContent = `DISCORD_WEBHOOK_URL=${webhookUrl}
DISCORD_CHANNEL_ID=${channelId}
UPDATE_INTERVAL=${updateInterval}`;

    await fs.writeFile(configPath, envContent);
    console.log('.env configuration file created successfully');

    const files = [
      { 
        url: 'https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/index.js',
        dest: path.join(__dirname, 'index.js') 
      },
      { 
        url: 'https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/systemInfo.js',
        dest: path.join(__dirname, 'systemInfo.js') 
      }
    ];

    console.log('Downloading necessary files from GitHub...');
    for (const file of files) {
      await downloadFile(file.url, file.dest);
    }

    console.log('Installing dependencies...');
    exec('npm install', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing dependencies: ${error.message}`);
        return;
      }
      
      console.log('Dependencies installed successfully!');
      console.log('\nSetup completed successfully!');
      console.log('\nTo start the VPS monitoring bot, run:');
      console.log('npm start');
    });

  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setupVpsBot();