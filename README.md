# VPS-BotStat

A Discord webhook-based VPS status monitoring tool that collects and sends system information to a Discord channel.

## Features

- Collects system information:
  - RAM usage
  - IP address
  - Disk space
  - CPU clock speed
  - CPU cores
  - Operating system
  - Processor information
  - And more...
- Sends information via Discord webhook
- Easy setup with a simple command
- Automatically fetches necessary files from GitHub

## Usage

1. Clone this repository on your VPS
2. Run `node setup.js`
3. Follow the prompts to enter your Discord webhook URL and channel ID
4. System information will be sent to your specified Discord channel

## Requirements

- Node.js
- npm 