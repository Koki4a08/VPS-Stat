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

# Get webhook URL and validate
webhook_url=""
webhook_valid=false

while [ "$webhook_valid" = false ]; do
    # Use command explicitly in terminal mode
    exec < /dev/tty
    echo -n "Enter your Discord webhook URL: "
    read webhook_url
    exec <&-
    
    if [[ "$webhook_url" =~ ^https://discord\.com/api/webhooks/ ]]; then
        webhook_valid=true
    else
        echo "Invalid webhook URL format. It should start with https://discord.com/api/webhooks/"
    fi
done

# Get channel ID and validate
channel_id=""
channel_valid=false

while [ "$channel_valid" = false ]; do
    # Use command explicitly in terminal mode
    exec < /dev/tty
    echo -n "Enter your Discord channel ID: "
    read channel_id
    exec <&-
    
    if [[ "$channel_id" =~ ^[0-9]+$ ]]; then
        channel_valid=true
    else
        echo "Invalid channel ID. It should contain only numbers."
    fi
done

# Get update interval
exec < /dev/tty
echo -n "Enter update interval in minutes (default: 10): "
read update_interval
exec <&-

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

# Send an initial message to Discord to get the message ID
echo
echo "=== Sending Initial Message to Discord ==="
echo "We will now send a test message to Discord and ask you to provide the message ID."
echo

# Function to send a Discord message and return message ID
send_discord_message() {
    local message=$(cat <<EOF
{
  "content": "VPS Status Monitor - Initial Setup",
  "embeds": [
    {
      "title": "VPS-Stat Setup",
      "description": "This is an initial setup message. The status updates will replace this message.\n\n**Please copy the message ID from this message's URL.**\n\nTo get the message ID, right-click this message, select 'Copy Message Link' and extract the ID from the end of the URL. The URL will look like: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID",
      "color": 3447003
    }
  ]
}
EOF
)

    # Send message to webhook
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$message" "$1")
    echo "$response"
}

# Send test message
echo "Sending test message to Discord..."
result=$(send_discord_message "$webhook_url")
echo "Discord response: $result"

# Check if we got an ID from Discord
has_id=false
if [[ "$result" == *"\"id\""* ]]; then
    message_id=$(echo "$result" | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)
    if [[ ! -z "$message_id" ]]; then
        has_id=true
        echo "Automatically detected message ID: $message_id"
    fi
fi

# If we couldn't automatically extract the ID, ask the user
if [ "$has_id" = false ]; then
    echo
    echo "Please check your Discord channel. A test message has been sent."
    echo
    echo "Right-click on the message, select 'Copy Message Link', and paste it here."
    exec < /dev/tty
    echo -n "Discord message link: "
    read message_link
    exec <&-
    
    # Extract message ID from link
    if [[ "$message_link" =~ /([0-9]+)$ ]]; then
        message_id="${BASH_REMATCH[1]}"
    else
        echo "Could not extract message ID from link. Please enter it manually."
        exec < /dev/tty
        echo -n "Message ID: "
        read message_id
        exec <&-
    fi
fi

# Ensure data directory exists
mkdir -p data

# Save message ID to file
echo "$message_id" > data/message_id.txt
echo "Message ID saved: $message_id"

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