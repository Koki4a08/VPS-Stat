#!/bin/bash

# One-click installer for VPS-Stat
# Sets up and starts the service in the background

echo "==== VPS-Stat One-Click Installation ===="
echo "This script will install VPS-Stat, set it up, and run it as a background service."
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

# Create .env file
echo "Please enter your Discord webhook URL (must start with https://discord.com/api/webhooks/):"
read webhook_url

if [[ ! "$webhook_url" =~ ^https://discord\.com/api/webhooks/ ]]; then
    echo "Invalid webhook URL format. Exiting."
    exit 1
fi

echo "Please enter your Discord channel ID (numbers only):"
read channel_id

if [[ ! "$channel_id" =~ ^[0-9]+$ ]]; then
    echo "Invalid channel ID format. Exiting."
    exit 1
fi

echo "Please enter update interval in minutes (default is 10):"
read update_interval

if [[ -z "$update_interval" ]]; then
    update_interval=10
fi

# Create .env file
echo "Creating configuration file..."
cat > .env << EOF
DISCORD_WEBHOOK_URL=$webhook_url
DISCORD_CHANNEL_ID=$channel_id
UPDATE_INTERVAL=$update_interval
EOF

echo "Configuration file created successfully."

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
echo "========================================================" 