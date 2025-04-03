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
  console.log('==== VPS-Stat Setup ====');
  
  try {
    console.log('Checking dependencies...');
    
    await fs.ensureDir(path.join(__dirname, 'data'));
    
    console.log('\n------------------------------------------');
    console.log('Please enter your Discord webhook information:');
    console.log('------------------------------------------\n');
    
    // Use readline for cleaner input that won't conflict with console output
    const { createInterface } = require('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Custom prompt function
    const promptInput = (question, validator) => {
      return new Promise((resolve) => {
        const askQuestion = () => {
          rl.question(question, (answer) => {
            if (validator) {
              const validationResult = validator(answer);
              if (validationResult !== true) {
                console.log(`>> ${validationResult}`);
                return askQuestion();
              }
            }
            resolve(answer);
          });
        };
        askQuestion();
      });
    };

    // Get webhook URL
    const webhookUrl = await promptInput('Enter your Discord webhook URL: ', (input) => {
      if (!input) return 'Webhook URL is required';
      if (!input.startsWith('https://discord.com/api/webhooks/')) {
        return 'Invalid webhook URL format. It should start with https://discord.com/api/webhooks/';
      }
      return true;
    });

    // Get channel ID
    const channelId = await promptInput('Enter your Discord channel ID: ', (input) => {
      if (!input) return 'Channel ID is required';
      if (!/^\d+$/.test(input)) {
        return 'Invalid channel ID. It should contain only numbers.';
      }
      return true;
    });

    // Get update interval
    const updateInterval = await promptInput('Enter update interval in minutes (default: 10): ', (input) => {
      if (!input) return true; // Default value will be used
      const num = parseInt(input);
      if (isNaN(num) || num <= 0) {
        return 'Please enter a positive number';
      }
      return true;
    }) || '10';

    // Close readline
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