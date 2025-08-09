// Global variables
let socket;
let statusUpdateInterval;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocketIO();
    initializeStatusUpdates();
    initializeEventListeners();
    showAlert('Panel załadowany pomyślnie', 'success');
});

// Socket.IO initialization
function initializeSocketIO() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Połączono z serwerem');
    });
    
    socket.on('disconnect', function() {
        console.log('Rozłączono z serwerem');
        showAlert('Utracono połączenie z serwerem', 'warning');
    });
    
    socket.on('bot_status_update', function(data) {
        updateStatusIndicators(data);
    });
    
    socket.on('log_message', function(data) {
        addLogMessage(data.message, data.level);
    });
    
    socket.on('stats_update', function(data) {
        updateStatsDisplay(data);
    });
}

// Status updates
function initializeStatusUpdates() {
    updateStatus();
    statusUpdateInterval = setInterval(updateStatus, 5000); // Update every 5 seconds
}

async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        updateStatusIndicators(data);
    } catch (error) {
        console.error('Błąd aktualizacji statusu:', error);
    }
}

function updateStatusIndicators(status) {
    // Dashboard indicators
    updateIndicator('twitch-status', status.twitch, 'Twitch');
    updateIndicator('discord-status', status.discord, 'Discord');
    
    // Control tab indicators
    updateIndicator('twitch-status-control', status.twitch);
    updateIndicator('discord-status-control', status.discord);
    
    // Update status text
    const twitchStatusText = document.getElementById('twitch-status-text');
    const discordStatusText = document.getElementById('discord-status-text');
    
    if (twitchStatusText) {
        twitchStatusText.textContent = `Status: ${status.twitch ? 'Online' : 'Offline'}`;
    }
    
    if (discordStatusText) {
        discordStatusText.textContent = `Status: ${status.discord ? 'Online' : 'Offline'}`;
    }
}

function updateIndicator(elementId, isOnline, label = '') {
    const indicator = document.getElementById(elementId);
    if (indicator) {
        indicator.className = `status-indicator ${isOnline ? 'status-online' : 'status-offline'}`;
        
        if (label && indicator.nextElementSibling) {
            indicator.nextElementSibling.textContent = `${label}: ${isOnline ? 'Online' : 'Offline'}`;
        }
    }
}

// Event listeners
function initializeEventListeners() {
    // Add points form
    const addPointsForm = document.getElementById('add-points-form');
    if (addPointsForm) {
        addPointsForm.addEventListener('submit', handleAddPoints);
    }
    
    // Tab change listeners
    document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', handleTabChange);
    });
    
    // Auto-refresh for active tabs
    setInterval(() => {
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const target = activeTab.getAttribute('href');
            if (target === '#stats-content') {
                updateStats();
            } else if (target === '#leaderboard-content') {
                refreshLeaderboard();
            }
        }
    }, 30000); // Refresh every 30 seconds
}

function handleTabChange(e) {
    const target = e.target.getAttribute('href');
    
    switch (target) {
        case '#stats-content':
            updateStats();
            break;
        case '#leaderboard-content':
            refreshLeaderboard();
            break;
        case '#dashboard-content':
            updateStats();
            break;
    }
}

async function handleAddPoints(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const points = parseInt(document.getElementById('points').value);
    
    if (!username || isNaN(points)) {
        showAlert('Wprowadź poprawne dane', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/points/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, points })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            document.getElementById('add-points-form').reset();
            updateStats();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Błąd dodawania punktów', 'danger');
    }
}

// Bot control functions
async function controlBot(botType, action) {
    const buttonId = `${botType}-${action}`;
    const button = document.getElementById(buttonId);
    
    if (!button) return;
    
    const originalText = button.innerHTML;
    showLoading(buttonId);
    
    try {
        const response = await fetch(`/api/bot/${botType}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            setTimeout(updateStatus, 1000); // Update status after 1 second
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Błąd komunikacji z serwerem', 'danger');
    } finally {
        hideLoading(buttonId, originalText);
    }
}

async function startAllBots() {
    showAlert('Uruchamianie wszystkich botów...', 'info');
    await controlBot('twitch', 'start');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await controlBot('discord', 'start');
}

async function stopAllBots() {
    showAlert('Zatrzymywanie wszystkich botów...', 'info');
    await controlBot('twitch', 'stop');
    await controlBot('discord', 'stop');
}

async function restartAllBots() {
    showAlert('Restartowanie wszystkich botów...', 'info');
    await controlBot('twitch', 'restart');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await controlBot('discord', 'restart');
}

// Stats functions
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.error) {
            console.error('Błąd ładowania statystyk:', data.error);
            return;
        }
        
        updateStatsDisplay(data);
        
    } catch (error) {
        console.error('Błąd aktualizacji statystyk:', error);
    }
}

function updateStatsDisplay(data) {
    // Update quick stats
    updateElement('quick-users', data.total_users || 0);
    updateElement('quick-points', data.total_points || 0);
    updateElement('quick-messages', data.total_messages || 0);
    updateElement('quick-avg', (data.avg_points || 0).toFixed(1));
    
    // Update detailed stats
    updateElement('total-users', data.total_users || 0);
    updateElement('total-points', data.total_points || 0);
    updateElement('total-messages', data.total_messages || 0);
    updateElement('avg-points', (data.avg_points || 0).toFixed(1));
    
    // Update top users
    if (data.top_users) {
        updateTopUsers(data.top_users);
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateTopUsers(topUsers) {
    const container = document.getElementById('top-users-list');
    if (!container) return;
    
    if (!topUsers || topUsers.length === 0) {
        container.innerHTML = '<p class="text-muted">Brak danych</p>';
        return;
    }
    
    const html = topUsers.slice(0, 5).map((user, index) => `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span>${index + 1}. ${user.username}</span>
            <span class="badge bg-primary">${user.points} pkt</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

async function refreshStats() {
    await updateStats();
    showAlert('Statystyki odświeżone', 'success');
}

// Leaderboard functions
async function refreshLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error, 'danger');
            return;
        }
        
        const tbody = document.getElementById('leaderboard-table');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Brak danych</td></tr>';
            return;
        }
        
        const html = data.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td>${user.points}</td>
                <td>${user.messages}</td>
                <td>${user.last_seen || 'Nigdy'}</td>
                <td>${user.is_follower ? '✅' : '❌'}</td>
            </tr>
        `).join('');
        
        tbody.innerHTML = html;
        
    } catch (error) {
        showAlert('Błąd ładowania rankingu', 'danger');
    }
}

// Points management
async function clearPoints(type) {
    const confirmMessage = type === 'all' 
        ? 'Czy na pewno chcesz wyczyścić punkty WSZYSTKICH użytkowników?' 
        : 'Czy na pewno chcesz wyczyścić punkty nie-followerów?';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await fetch('/api/points/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Wyczyszczono punkty ${result.affected} użytkowników`, 'success');
            updateStats();
            refreshLeaderboard();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Błąd czyszczenia punktów', 'danger');
    }
}

// Log functions
function addLogMessage(message, level = 'info') {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const levelColor = {
        'info': '#00ff00',
        'warning': '#ffff00',
        'error': '#ff0000',
        'debug': '#00ffff'
    }[level] || '#00ff00';
    
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `<span style="color: #888">[${timestamp}]</span> <span style="color: ${levelColor}">${message}</span>`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Keep only last 100 log entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function clearLogs() {
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        logContainer.innerHTML = '<div class="text-muted">Logi wyczyszczone</div>';
    }
}

// Utility functions
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.flash-message');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show flash-message`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to flash messages container
    let flashContainer = document.querySelector('.flash-messages');
    if (!flashContainer) {
        flashContainer = document.createElement('div');
        flashContainer.className = 'flash-messages';
        document.body.appendChild(flashContainer);
    }
    
    flashContainer.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<div class="loading" style="width: 20px; height: 20px;"></div>';
    }
}

function hideLoading(buttonId, originalText) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('pl-PL').format(num);
}

function formatDate(dateString) {
    if (!dateString) return 'Nigdy';
    return new Date(dateString).toLocaleString('pl-PL');
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    if (socket) {
        socket.disconnect();
    }
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    showAlert('Wystąpił błąd aplikacji', 'danger');
});

// Handle fetch errors globally
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args)
        .catch(error => {
            console.error('Fetch error:', error);
            showAlert('Błąd połączenia z serwerem', 'danger');
            throw error;
        });
};

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+R or F5 - Refresh current tab
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const target = activeTab.getAttribute('href');
            if (target === '#stats-content') {
                refreshStats();
            } else if (target === '#leaderboard-content') {
                refreshLeaderboard();
            }
        }
    }
    
    // Ctrl+1-6 - Switch tabs
    if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        const tabs = document.querySelectorAll('[data-bs-toggle="pill"]');
        if (tabs[tabIndex]) {
            tabs[tabIndex].click();
        }
    }
});

// Touch/mobile support
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe up - refresh current tab
            const activeTab = document.querySelector('.nav-link.active');
            if (activeTab) {
                const target = activeTab.getAttribute('href');
                if (target === '#stats-content') {
                    refreshStats();
                } else if (target === '#leaderboard-content') {
                    refreshLeaderboard();
                }
            }
        }
    }
}

// Export functions for global access
window.controlBot = controlBot;
window.startAllBots = startAllBots;
window.stopAllBots = stopAllBots;
window.restartAllBots = restartAllBots;
window.refreshStats = refreshStats;
window.refreshLeaderboard = refreshLeaderboard;
window.clearPoints = clearPoints;
window.clearLogs = clearLogs;
window.showAlert = showAlert;