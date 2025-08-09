# KranikBot Web Panel

Web-based control panel for KranikBot that replicates all functionalities of the local desktop panel.

## Features

- 🔐 Password-based login (admin/admin)
- 🤖 Bot control (start/stop/restart Twitch and Discord bots)
- 📊 Real-time statistics and leaderboard
- 🎯 Point management (add/clear points)
- 📝 Live log monitoring
- 🌐 Cross-platform browser access
- 📱 Mobile-friendly responsive design

## Installation

1. Navigate to the web_panel directory:
```bash
cd web_panel
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Web Panel

1. Start the web server:
```bash
python app.py
```

2. Open your browser and go to:
```
http://localhost:5000
```

3. Login with default credentials:
- Username: `admin`
- Password: `admin`

## Configuration

You can modify the following settings in `app.py`:

- `ADMIN_USERNAME` - Change admin username
- `ADMIN_PASSWORD` - Change admin password
- `SECRET_KEY` - Change Flask secret key for sessions
- Port and host settings

## Features Overview

### Dashboard
- Quick bot status overview
- System statistics
- Quick action buttons

### Bot Control
- Individual bot management (Twitch/Discord)
- Start/Stop/Restart all bots
- Real-time status updates

### Statistics
- Total users, points, messages
- Average statistics
- Top users display

### Leaderboard
- Top 100 users ranking
- Points and message counts
- Last seen information
- Follower status

### Point Management
- Add points to specific users
- Clear all points
- Clear non-followers' points

### Live Logs
- Real-time log monitoring
- Clear log functionality
- Timestamped entries

## Security

- Session-based authentication
- CSRF protection
- Secure password handling
- Login required for all functions

## Compatibility

- Works with existing KranikBot database
- Compatible with current bot scripts
- No changes needed to existing bot code

## Raspberry Pi Deployment

This web panel is designed to run on Raspberry Pi, allowing remote control of your bots from any device with a web browser.

1. Transfer the web_panel folder to your Raspberry Pi
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python app.py`
4. Access from any device on your network: `http://[raspberry-pi-ip]:5000`