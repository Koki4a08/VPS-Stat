#!/bin/bash

# VPS-BotStat Installation Script

echo "==== VPS-BotStat Installation ===="
echo "This script will install VPS-BotStat on your system."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    
    # Install Node.js based on the distribution
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

# Create a directory for VPS-BotStat
echo "Creating VPS-BotStat directory..."
mkdir -p ~/vps-botstat
cd ~/vps-botstat

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

# Run the setup script
echo "Running setup script..."
node setup.js

echo
echo "Installation completed!"
echo "You can start the VPS monitoring service by running: cd ~/vps-botstat && npm start"
echo
echo "To automatically start the service on system boot, you can set up a systemd service or cron job."
echo "Example systemd service:"
echo
echo "Create file /etc/systemd/system/vps-botstat.service with content:"
echo "
[Unit]
Description=VPS Monitoring Discord Bot
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
"
echo
echo "Then run:"
echo "sudo systemctl enable vps-botstat"
echo "sudo systemctl start vps-botstat" 