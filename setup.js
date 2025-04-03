const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

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
  console.log('==== VPS-BotStat Setup ====');
  
  try {
    console.log('Checking dependencies...');
    
    await fs.ensureDir(path.join(__dirname, 'data'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'webhookUrl',
        message: 'Enter your Discord webhook URL:',
        validate: input => {
          if (!input) return 'Webhook URL is required';
          if (!input.startsWith('https://discord.com/api/webhooks/')) {
            return 'Invalid webhook URL format. It should start with https://discord.com/api/webhooks/';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'channelId',
        message: 'Enter your Discord channel ID:',
        validate: input => {
          if (!input) return 'Channel ID is required';
          if (!/^\d+$/.test(input)) {
            return 'Invalid channel ID. It should contain only numbers.';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'updateInterval',
        message: 'Enter update interval in minutes (default: 10):',
        default: '10',
        validate: input => {
          const num = parseInt(input);
          if (isNaN(num) || num <= 0) {
            return 'Please enter a positive number';
          }
          return true;
        }
      }
    ]);

    const envContent = `DISCORD_WEBHOOK_URL=${answers.webhookUrl}
DISCORD_CHANNEL_ID=${answers.channelId}
UPDATE_INTERVAL=${answers.updateInterval}`;

    await fs.writeFile(configPath, envContent);
    console.log('.env configuration file created successfully');

    const files = [
      { 
        url: 'https://raw.githubusercontent.com/yourusername/VPS-BotStat/main/index.js',
        dest: path.join(__dirname, 'index.js') 
      },
      { 
        url: 'https://raw.githubusercontent.com/yourusername/VPS-BotStat/main/systemInfo.js',
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