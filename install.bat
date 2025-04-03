@echo off
echo ==== VPS-BotStat Installation for Windows ====
echo This script will install VPS-BotStat on your system.
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Creating VPS-BotStat directory...
mkdir "%USERPROFILE%\vps-botstat" 2>nul
cd /d "%USERPROFILE%\vps-botstat"

echo Downloading project files from GitHub...
curl -L -o main.zip https://github.com/yourusername/VPS-BotStat/archive/refs/heads/main.zip

echo Extracting files...
powershell -command "Expand-Archive -Force -Path main.zip -DestinationPath ."
xcopy /E /Y "VPS-BotStat-main\*" "."
rmdir /S /Q "VPS-BotStat-main"
del main.zip

echo Installing dependencies...
call npm install

echo Running setup script...
node setup.js

echo.
echo Installation completed!
echo.
echo You can start the VPS monitoring service by:
echo 1. Open a Command Prompt
echo 2. Run: cd %USERPROFILE%\vps-botstat
echo 3. Run: npm start
echo.
echo To automatically start the service on system boot, create a task in Task Scheduler
echo that runs "node %USERPROFILE%\vps-botstat\index.js" on startup.
echo.
pause 