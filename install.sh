#!/bin/bash

# One-click installer for VPS-Stat
# Sets up and starts the service in the background

echo "==== VPS-Stat Installation ===="
echo "This script will install VPS-Stat on your system."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo dnf install -y nodejs
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo "Unsupported distribution. Please install Node.js manually and run this script again."
        exit 1
    fi
    
    echo "Node.js installed successfully!"
else
    echo "Node.js is already installed."
fi

# Create a directory for VPS-Stat
echo "Creating VPS-Stat directory..."
mkdir -p ~/vps-stat
cd ~/vps-stat

# Download project files from GitHub
echo "Downloading project files from GitHub..."
curl -LO https://github.com/Koki4a08/VPS-Stat/archive/refs/heads/main.zip

# Check if unzip is installed
if ! command -v unzip &> /dev/null; then
    echo "Installing unzip..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y unzip
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y unzip
    elif command -v yum &> /dev/null; then
        sudo yum install -y unzip
    else
        echo "Could not install unzip. Please install it manually."
        exit 1
    fi
fi

# Extract the files
echo "Extracting files..."
unzip -o main.zip
cp -r VPS-Stat-main/* .
rm -rf VPS-Stat-main main.zip

# Install Node.js dependencies
echo "Installing dependencies..."
npm install

# Direct configuration without using setup.js
echo
echo "=== VPS-Stat Configuration ==="
echo

# Use read command with prompt for webhook URL
echo -n "Enter your Discord webhook URL: "
read -r webhook_url

# Validate webhook URL format
while [[ ! "$webhook_url" =~ ^https://discord\.com/api/webhooks/ ]]; do
    echo "Invalid webhook URL format. It should start with https://discord.com/api/webhooks/"
    echo -n "Enter your Discord webhook URL: "
    read -r webhook_url
done

# Prompt for channel ID
echo -n "Enter your Discord channel ID: "
read -r channel_id

# Validate channel ID format
while [[ ! "$channel_id" =~ ^[0-9]+$ ]]; do
    echo "Invalid channel ID. It should contain only numbers."
    echo -n "Enter your Discord channel ID: "
    read -r channel_id
done

# Prompt for update interval with default
echo -n "Enter update interval in minutes (default: 10): "
read -r update_interval

# Set default if empty
if [[ -z "$update_interval" ]]; then
    update_interval=10
fi

# Save configuration to .env file
echo "Creating .env file..."
cat > .env << EOF
DISCORD_WEBHOOK_URL=$webhook_url
DISCORD_CHANNEL_ID=$channel_id
UPDATE_INTERVAL=$update_interval
EOF

echo "Configuration saved successfully."

# Setup systemd service (for system-wide autostart)
if command -v systemctl &> /dev/null; then
    echo "Setting up systemd service for automatic startup..."
    
    cat > vps-stat.service << EOF
[Unit]
Description=VPS Status Discord Bot
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo mv vps-stat.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable vps-stat
    sudo systemctl start vps-stat
    
    echo "Service started and enabled to run at boot."
    echo "You can check its status with: sudo systemctl status vps-stat"
    
else
    # Alternative: Use PM2 for process management
    echo "Installing PM2 process manager..."
    sudo npm install -g pm2
    
    echo "Starting service with PM2..."
    pm2 start index.js --name "vps-stat"
    pm2 save
    
    # Setup PM2 to start on boot
    pm2 startup | tail -n 1 | bash
    
    echo "Service started with PM2 and enabled to run at boot."
    echo "You can check its status with: pm2 status"
fi

echo
echo "========================================================"
echo "VPS-Stat installation completed successfully!"
echo "The service is now running in the background and will"
echo "automatically start when your system boots."
echo "========================================================="
echo "Your Discord channel will now receive VPS status updates."
echo "The same message will be updated rather than creating new ones."
echo "=========================================================" 