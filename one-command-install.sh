#!/bin/bash

# VPS-Stat one-command interactive installer
# This downloads the install script and runs it interactively

# DO NOT pipe this script - it needs direct terminal access for input
if [ ! -t 0 ]; then
  echo "ERROR: This script must be run directly, not piped."
  echo "Please download the script first, then run it directly:"
  echo "wget https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/one-command-install.sh"
  echo "chmod +x one-command-install.sh"
  echo "./one-command-install.sh"
  exit 1
fi

# Download the script
echo "Downloading installation script..."
wget -q https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/install.sh -O /tmp/vps-stat-installer.sh || {
  echo "ERROR: Failed to download install script"
  exit 1
}

# Make it executable
chmod +x /tmp/vps-stat-installer.sh

# Run the script directly to preserve terminal interaction
echo "Starting installation..."
/tmp/vps-stat-installer.sh

# Clean up
rm /tmp/vps-stat-installer.sh 