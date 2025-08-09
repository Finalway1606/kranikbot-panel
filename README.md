# 🎨 KranikBot Web Panel Frontend

Web-based control panel for KranikBot that replicates all functionalities of the local desktop panel.

## ✨ Features

- 🔐 **Secure Login** - Password-based authentication (admin/admin)
- 🤖 **Bot Control** - Start/stop/restart Twitch and Discord bots
- 📊 **Real-time Statistics** - Live dashboard with user stats and metrics
- 🏆 **Leaderboard** - Top 100 users ranking with points and activity
- 🎯 **Point Management** - Add/clear points for users
- 📝 **Live Logs** - Real-time log monitoring with timestamps
- 🌐 **Cross-platform** - Works on any device with a web browser
- 📱 **Mobile-friendly** - Responsive design for all screen sizes
- 🎨 **Modern UI** - Dark theme with Bootstrap 5 styling

## 🚀 Quick Start

### Installation

1. Clone this repository:
```bash
git clone https://github.com/Finalway1606/kranikbot-panel.git
cd kranikbot-panel
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Web Panel

1. Start the web server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Login with default credentials:
- **Username:** `admin`
- **Password:** `admin`

## ⚙️ Configuration

You can modify the following settings in `app.py`:

- `ADMIN_USERNAME` - Change admin username
- `ADMIN_PASSWORD` - Change admin password  
- `SECRET_KEY` - Change Flask secret key for sessions
- Port and host settings

## 📋 Features Overview

### 🏠 Dashboard
- Quick bot status overview
- System statistics summary
- Quick action buttons for common tasks

### 🤖 Bot Control
- Individual bot management (Twitch/Discord)
- Start/Stop/Restart all bots at once
- Real-time status updates via WebSocket

### 📊 Statistics
- Total users, points, and messages
- Average statistics calculation
- Top users display with rankings

### 🏆 Leaderboard
- Top 100 users ranking by points
- Message counts and activity tracking
- Last seen information
- Follower status indicators

### 🎯 Point Management
- Add points to specific users
- Clear all points system-wide
- Clear points for non-followers only

### 📝 Live Logs
- Real-time log monitoring
- Clear log functionality
- Timestamped entries with emoji indicators

## 🔒 Security

- Session-based authentication
- CSRF protection built-in
- Secure password handling
- Login required for all administrative functions

## 🔧 Compatibility

- ✅ Works with existing KranikBot database
- ✅ Compatible with current bot scripts
- ✅ No changes needed to existing bot code
- ✅ Seamless integration with current setup

## 🍓 Raspberry Pi Deployment

This web panel is specifically designed to run on Raspberry Pi, allowing remote control of your bots from any device with a web browser.

### Deployment Steps:

1. **Transfer files** to your Raspberry Pi:
```bash
scp -r kranikbot-panel/ pi@your-pi-ip:~/
```

2. **Install dependencies** on Pi:
```bash
ssh pi@your-pi-ip
cd kranikbot-panel
pip install -r requirements.txt
```

3. **Run the panel**:
```bash
python app.py
```

4. **Access remotely** from any device on your network:
```
http://[raspberry-pi-ip]:5000
```

## 🛠️ Tech Stack

- **Backend:** Flask + Flask-SocketIO
- **Frontend:** Bootstrap 5 + Vanilla JavaScript
- **Real-time:** WebSocket communication
- **Database:** SQLite (compatible with existing KranikBot DB)
- **Styling:** Custom CSS with dark theme

## 📁 Project Structure

```
kranikbot-panel/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── static/
│   ├── style.css      # Custom CSS styles
│   └── script.js      # Frontend JavaScript
├── templates/
│   ├── base.html      # Base template
│   ├── login.html     # Login page
│   └── dashboard.html # Main dashboard
├── README.md          # This file
├── LICENSE           # MIT License
└── .gitignore        # Git ignore rules
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] User management interface
- [ ] Advanced analytics and charts
- [ ] Mobile app companion
- [ ] Docker containerization
- [ ] Multi-language support
- [ ] Theme customization
- [ ] API documentation
- [ ] Automated backups

---

**Made with ❤️ for the KranikBot community**
