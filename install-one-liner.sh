#!/bin/bash

# This is a one-line installer for VPS-Stat
# It downloads the install.sh script from GitHub and executes it

# Using curl with raw URL format
curl -fsSL https://raw.githubusercontent.com/Koki4a08/VPS-Stat/main/install.sh -o install.sh && chmod +x install.sh && ./install.sh 