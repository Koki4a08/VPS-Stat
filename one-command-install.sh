#!/bin/bash

# VPS-Stat one-command interactive installer
# This downloads the install script and runs it in interactive mode

# Download the script to a temporary file
curl -fsSL https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/install.sh -o /tmp/vps-stat-installer.sh 

# Make it executable
chmod +x /tmp/vps-stat-installer.sh 

# Run the script with interactive terminal
bash /tmp/vps-stat-installer.sh

# Clean up
rm /tmp/vps-stat-installer.sh 