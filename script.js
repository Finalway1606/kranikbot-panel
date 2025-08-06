// Konfiguracja - używa config.js lub fallback
const CONFIG = window.KRANIKBOT_CONFIG || {
    API_BASE_URL: 'http://localhost:5000/api',
    API_KEY: 'kranikbot_2025_secure_key',
    REFRESH_INTERVAL: 5000,
    DEMO_MODE: false
};

// Globalne zmienne
let serverUrl = CONFIG.API_BASE_URL || 'http://localhost:5000';
let apiKey = CONFIG.API_KEY || '';
let autoRefreshInterval = null;
let isConnected = false;

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initializeApp();
    setupEventListeners();
});

// Inicjalizacja aplikacji
function initializeApp() {
    updateConnectionStatus('connecting', 'Łączenie...');
    checkServerConnection();
    startAutoRefresh();
}

// Konfiguracja event listenerów
function setupEventListeners() {
    // Auto-refresh checkbox
    document.getElementById('autoRefresh').addEventListener('change', function() {
        if (this.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    // Refresh interval change
    document.getElementById('refreshInterval').addEventListener('change', function() {
        if (document.getElementById('autoRefresh').checked) {
            startAutoRefresh();
        }
    });
}

// Zarządzanie połączeniem z serwerem
async function checkServerConnection() {
    try {
        const response = await fetch(`${serverUrl}/api/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 5000
        });

        if (response.ok) {
            isConnected = true;
            updateConnectionStatus('connected', 'Połączono');
            await refreshAllData();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        isConnected = false;
        updateConnectionStatus('disconnected', 'Brak połączenia');
        console.error('Connection error:', error);
        
        // Fallback - symulacja danych dla demo
        simulateOfflineMode();
    }
}

// Aktualizacja statusu połączenia
function updateConnectionStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
}

// Symulacja trybu offline dla demo
function simulateOfflineMode() {
    addLog('warning', '⚠️ Tryb demo - brak połączenia z serwerem');
    
    // Symulowane dane
    updateBotStatus('twitch', 'offline', null, '00:00:00');
    updateBotStatus('discord', 'offline', null, '00:00:00');
    
    // Symulowane statystyki
    document.getElementById('twitchFollowers').textContent = '1,234';
    document.getElementById('twitchSubs').textContent = '56';
    document.getElementById('twitchVips').textContent = '12';
    document.getElementById('twitchMods').textContent = '8';
    document.getElementById('totalUsers').textContent = '2,345';
    document.getElementById('totalPoints').textContent = '123,456';
    document.getElementById('topUser').textContent = 'KranikUser';
}

// Funkcje kontroli botów
async function startTwitchBot() {
    await executeAction('start_twitch', 'Uruchamianie Twitch Bot...');
}

async function stopTwitchBot() {
    await executeAction('stop_twitch', 'Zatrzymywanie Twitch Bot...');
}

async function restartTwitchBot() {
    await executeAction('restart_twitch', 'Restartowanie Twitch Bot...');
}

async function startDiscordBot() {
    await executeAction('start_discord', 'Uruchamianie Discord Bot...');
}

async function stopDiscordBot() {
    await executeAction('stop_discord', 'Zatrzymywanie Discord Bot...');
}

async function restartDiscordBot() {
    await executeAction('restart_discord', 'Restartowanie Discord Bot...');
}

async function startAllBots() {
    showLoading();
    addLog('info', '🚀 Uruchamianie wszystkich botów...');
    
    try {
        await startTwitchBot();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startDiscordBot();
        showNotification('success', '✅ Wszystkie boty zostały uruchomione');
    } catch (error) {
        showNotification('error', '❌ Błąd podczas uruchamiania botów');
    } finally {
        hideLoading();
    }
}

async function stopAllBots() {
    showLoading();
    addLog('info', '🛑 Zatrzymywanie wszystkich botów...');
    
    try {
        await stopTwitchBot();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await stopDiscordBot();
        showNotification('success', '✅ Wszystkie boty zostały zatrzymane');
    } catch (error) {
        showNotification('error', '❌ Błąd podczas zatrzymywania botów');
    } finally {
        hideLoading();
    }
}

async function restartAllBots() {
    showLoading();
    addLog('info', '🔄 Restartowanie wszystkich botów...');
    
    try {
        await restartTwitchBot();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await restartDiscordBot();
        showNotification('success', '✅ Wszystkie boty zostały zrestartowane');
    } catch (error) {
        showNotification('error', '❌ Błąd podczas restartowania botów');
    } finally {
        hideLoading();
    }
}

// Wykonywanie akcji na serwerze
async function executeAction(action, message) {
    if (!isConnected) {
        // Symulacja dla trybu demo
        simulateAction(action, message);
        return;
    }

    showLoading();
    addLog('info', message);

    try {
        const response = await fetch(`${serverUrl}/api/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ action: action })
        });

        const result = await response.json();

        if (response.ok) {
            addLog('success', `✅ ${result.message}`);
            showNotification('success', result.message);
            await refreshAllData();
        } else {
            throw new Error(result.error || 'Nieznany błąd');
        }
    } catch (error) {
        addLog('error', `❌ Błąd: ${error.message}`);
        showNotification('error', `Błąd: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Symulacja akcji dla trybu demo
function simulateAction(action, message) {
    showLoading();
    addLog('info', `[DEMO] ${message}`);

    setTimeout(() => {
        const isStart = action.includes('start');
        const isStop = action.includes('stop');
        const isRestart = action.includes('restart');
        const botType = action.includes('twitch') ? 'twitch' : 'discord';

        if (isStart) {
            updateBotStatus(botType, 'online', Math.floor(Math.random() * 10000), '00:00:01');
            addLog('success', `✅ [DEMO] ${botType.toUpperCase()} Bot uruchomiony`);
            showNotification('success', `${botType.toUpperCase()} Bot uruchomiony (demo)`);
        } else if (isStop) {
            updateBotStatus(botType, 'offline', null, '00:00:00');
            addLog('success', `✅ [DEMO] ${botType.toUpperCase()} Bot zatrzymany`);
            showNotification('success', `${botType.toUpperCase()} Bot zatrzymany (demo)`);
        } else if (isRestart) {
            updateBotStatus(botType, 'starting', null, '00:00:00');
            addLog('info', `🔄 [DEMO] ${botType.toUpperCase()} Bot restartowanie...`);
            
            setTimeout(() => {
                updateBotStatus(botType, 'online', Math.floor(Math.random() * 10000), '00:00:01');
                addLog('success', `✅ [DEMO] ${botType.toUpperCase()} Bot zrestartowany`);
                showNotification('success', `${botType.toUpperCase()} Bot zrestartowany (demo)`);
            }, 2000);
        }

        hideLoading();
    }, 1000);
}

// Aktualizacja statusu bota
function updateBotStatus(botType, status, pid, uptime) {
    const statusElement = document.getElementById(`${botType}Status`);
    const pidElement = document.getElementById(`${botType}Pid`);
    const uptimeElement = document.getElementById(`${botType}Uptime`);

    // Aktualizuj status
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('span:last-child');

    statusDot.className = `status-dot ${status}`;
    
    switch (status) {
        case 'online':
            statusText.textContent = 'Online';
            break;
        case 'offline':
            statusText.textContent = 'Offline';
            break;
        case 'starting':
            statusText.textContent = 'Uruchamianie...';
            break;
        default:
            statusText.textContent = 'Nieznany';
    }

    // Aktualizuj PID i uptime
    pidElement.textContent = pid || '-';
    uptimeElement.textContent = uptime || '-';
}

// Odświeżanie danych
async function refreshAllData() {
    await Promise.all([
        refreshBotStatus(),
        refreshStats(),
        refreshLogs()
    ]);
    
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

async function refreshBotStatus() {
    if (!isConnected) return;

    try {
        const response = await fetch(`${serverUrl}/api/bots/status`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateBotStatus('twitch', data.twitch.status, data.twitch.pid, data.twitch.uptime);
            updateBotStatus('discord', data.discord.status, data.discord.pid, data.discord.uptime);
        }
    } catch (error) {
        console.error('Error refreshing bot status:', error);
    }
}

async function refreshStats() {
    if (!isConnected) return;

    try {
        const response = await fetch(`${serverUrl}/api/stats`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Aktualizuj statystyki Twitch
            document.getElementById('twitchFollowers').textContent = data.twitch.followers || 'N/A';
            document.getElementById('twitchSubs').textContent = data.twitch.subscribers || 'N/A';
            document.getElementById('twitchVips').textContent = data.twitch.vips || 'N/A';
            document.getElementById('twitchMods').textContent = data.twitch.moderators || 'N/A';
            
            // Aktualizuj statystyki bazy danych
            document.getElementById('totalUsers').textContent = data.database.total_users || 'N/A';
            document.getElementById('totalPoints').textContent = data.database.total_points || 'N/A';
            document.getElementById('topUser').textContent = data.database.top_user || 'N/A';
        }
    } catch (error) {
        console.error('Error refreshing stats:', error);
    }
}

function refreshStatus() {
    addLog('info', '🔄 Odświeżanie statusu...');
    checkServerConnection();
}

// Auto-refresh
function startAutoRefresh() {
    stopAutoRefresh();
    
    const interval = parseInt(document.getElementById('refreshInterval').value) * 1000;
    autoRefreshInterval = setInterval(() => {
        if (isConnected) {
            refreshAllData();
        } else {
            checkServerConnection();
        }
    }, interval);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Zarządzanie zakładkami
function showTab(tabName) {
    // Ukryj wszystkie zakładki
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    // Usuń aktywną klasę z przycisków
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Pokaż wybraną zakładkę
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Dodaj aktywną klasę do przycisku
    event.target.classList.add('active');

    // Specjalne akcje dla konkretnych zakładek
    if (tabName === 'logs') {
        refreshLogs();
    } else if (tabName === 'ranking') {
        refreshRanking();
    }
}

// Zarządzanie logami
function addLog(type, message) {
    const logsContent = document.getElementById('logsContent');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const time = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logsContent.appendChild(logEntry);
    logsContent.scrollTop = logsContent.scrollHeight;

    // Ogranicz liczbę logów do 100
    const logs = logsContent.querySelectorAll('.log-entry');
    if (logs.length > 100) {
        logs[0].remove();
    }
}

function clearLogs() {
    document.getElementById('logsContent').innerHTML = '';
    addLog('info', '🗑️ Logi zostały wyczyszczone');
}

async function refreshLogs() {
    if (!isConnected) {
        addLog('warning', '⚠️ Brak połączenia z serwerem - nie można pobrać logów');
        return;
    }

    try {
        addLog('info', '🔄 Pobieranie logów z serwera...');
        
        const response = await fetch(`${serverUrl}/api/logs`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Wyczyść obecne logi (oprócz lokalnych logów panelu)
            const logsContent = document.getElementById('logsContent');
            const localLogs = Array.from(logsContent.querySelectorAll('.log-entry'))
                .filter(log => log.textContent.includes('Web Panel') || 
                              log.textContent.includes('Sprawdzanie połączenia') ||
                              log.textContent.includes('Pobieranie logów'));
            
            logsContent.innerHTML = '';
            
            // Przywróć lokalne logi panelu
            localLogs.forEach(log => logsContent.appendChild(log));
            
            // Dodaj logi z serwera
            if (data.logs && Array.isArray(data.logs)) {
                data.logs.forEach(logEntry => {
                    const logDiv = document.createElement('div');
                    logDiv.className = `log-entry ${logEntry.type || 'info'}`;
                    
                    logDiv.innerHTML = `
                        <span class="log-time">[${logEntry.timestamp || new Date().toLocaleTimeString()}]</span>
                        <span class="log-message">${logEntry.message || ''}</span>
                    `;
                    
                    logsContent.appendChild(logDiv);
                });
                
                logsContent.scrollTop = logsContent.scrollHeight;
                addLog('success', `✅ Pobrano ${data.logs.length} logów z serwera`);
            } else {
                addLog('warning', '⚠️ Brak logów na serwerze');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        addLog('error', `❌ Błąd pobierania logów: ${error.message}`);
        console.error('Error refreshing logs:', error);
    }
}

// Zarządzanie ustawieniami
function loadSettings() {
    const savedUrl = localStorage.getItem('kranikbot_server_url');
    const savedApiKey = localStorage.getItem('kranikbot_api_key');
    const savedRefreshInterval = localStorage.getItem('kranikbot_refresh_interval');
    const savedAutoRefresh = localStorage.getItem('kranikbot_auto_refresh');

    if (savedUrl) {
        serverUrl = savedUrl;
        document.getElementById('serverUrl').value = savedUrl;
    }

    if (savedApiKey) {
        apiKey = savedApiKey;
        document.getElementById('apiKey').value = savedApiKey;
    }

    if (savedRefreshInterval) {
        document.getElementById('refreshInterval').value = savedRefreshInterval;
    }

    if (savedAutoRefresh !== null) {
        document.getElementById('autoRefresh').checked = savedAutoRefresh === 'true';
    }
}

function saveSettings() {
    serverUrl = document.getElementById('serverUrl').value;
    apiKey = document.getElementById('apiKey').value;
    const refreshInterval = document.getElementById('refreshInterval').value;
    const autoRefresh = document.getElementById('autoRefresh').checked;

    localStorage.setItem('kranikbot_server_url', serverUrl);
    localStorage.setItem('kranikbot_api_key', apiKey);
    localStorage.setItem('kranikbot_refresh_interval', refreshInterval);
    localStorage.setItem('kranikbot_auto_refresh', autoRefresh.toString());

    showNotification('success', '💾 Ustawienia zostały zapisane');
    addLog('success', '💾 Ustawienia zostały zapisane');

    // Sprawdź połączenie z nowym URL
    checkServerConnection();
    
    // Restart auto-refresh z nowym interwałem
    if (autoRefresh) {
        startAutoRefresh();
    }
}

// UI Helper functions
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showNotification(type, message) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove po 5 sekundach
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Kliknięcie usuwa notyfikację
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl + R - Refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshStatus();
    }
    
    // Ctrl + 1-3 - Switch tabs
    if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const tabs = ['stats', 'logs', 'settings'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
            showTab(tabs[tabIndex]);
        }
    }
});

// Funkcja wylogowania
function logout() {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
        // Usuń dane autoryzacji
        localStorage.removeItem('kranikbot_auth');
        sessionStorage.removeItem('kranikbot_auth');
        
        // Przekieruj do strony logowania
        window.location.href = 'login.html';
    }
}

// Ranking Functions
let currentModalUser = null;

async function refreshRanking() {
    if (!isConnected) {
        document.getElementById('rankingTableBody').innerHTML = 
            '<tr><td colspan="5" class="loading-row">⚠️ Brak połączenia z serwerem</td></tr>';
        return;
    }

    try {
        addLog('info', '🔄 Pobieranie rankingu użytkowników...');
        
        const limit = document.getElementById('rankingLimit').value;
        const response = await fetch(`${serverUrl}/api/users/ranking?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayRanking(data.ranking);
            addLog('success', `✅ Pobrano ranking ${data.ranking.length} użytkowników`);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        addLog('error', `❌ Błąd pobierania rankingu: ${error.message}`);
        document.getElementById('rankingTableBody').innerHTML = 
            '<tr><td colspan="5" class="loading-row">❌ Błąd pobierania danych</td></tr>';
    }
}

function displayRanking(ranking) {
    const tbody = document.getElementById('rankingTableBody');
    
    if (!ranking || ranking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Brak danych do wyświetlenia</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    ranking.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Pozycja z kolorami dla top 3
        const positionClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
        const positionIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        row.innerHTML = `
            <td class="position-cell ${positionClass}">${positionIcon} ${user.position}</td>
            <td class="username-cell">${user.username}</td>
            <td class="points-cell">${user.points.toLocaleString()}</td>
            <td>${user.messages || 0}</td>
            <td class="actions-cell">
                <button class="btn btn-action btn-success" onclick="openPointsModal('${user.username}', ${user.points}, 'add')" title="Dodaj punkty">➕</button>
                <button class="btn btn-action btn-warning" onclick="openPointsModal('${user.username}', ${user.points}, 'remove')" title="Odejmij punkty">➖</button>
                <button class="btn btn-action btn-danger" onclick="openPointsModal('${user.username}', ${user.points}, 'clear')" title="Wyczyść punkty">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function openPointsModal(username, currentPoints, action) {
    currentModalUser = { username, currentPoints, action };
    
    document.getElementById('modalUsername').value = username;
    document.getElementById('modalCurrentPoints').value = currentPoints;
    document.getElementById('modalPointsAmount').value = '';
    
    // Ustaw tytuł modala w zależności od akcji
    const modalTitle = document.getElementById('modalTitle');
    switch (action) {
        case 'add':
            modalTitle.textContent = `Dodaj punkty dla ${username}`;
            break;
        case 'remove':
            modalTitle.textContent = `Odejmij punkty dla ${username}`;
            break;
        case 'clear':
            modalTitle.textContent = `Wyczyść punkty dla ${username}`;
            break;
        default:
            modalTitle.textContent = `Zarządzanie punktami - ${username}`;
    }
    
    // Pokaż modal
    document.getElementById('pointsModal').classList.add('show');
}

function closePointsModal() {
    document.getElementById('pointsModal').classList.remove('show');
    currentModalUser = null;
}

async function addUserPoints() {
    const amount = parseInt(document.getElementById('modalPointsAmount').value);
    
    if (!amount || amount <= 0) {
        showNotification('error', '❌ Wprowadź prawidłową liczbę punktów');
        return;
    }
    
    await executePointsAction('add', amount);
}

async function removeUserPoints() {
    const amount = parseInt(document.getElementById('modalPointsAmount').value);
    
    if (!amount || amount <= 0) {
        showNotification('error', '❌ Wprowadź prawidłową liczbę punktów');
        return;
    }
    
    await executePointsAction('remove', amount);
}

async function clearUserPoints() {
    if (!confirm(`Czy na pewno chcesz wyczyścić wszystkie punkty użytkownika ${currentModalUser.username}?`)) {
        return;
    }
    
    await executePointsAction('clear', 0);
}

async function executePointsAction(action, amount) {
    if (!currentModalUser) return;
    
    try {
        showLoading();
        
        let endpoint, body, successMessage;
        
        switch (action) {
            case 'add':
                endpoint = '/api/users/points/add';
                body = { username: currentModalUser.username, points: amount };
                successMessage = `✅ Dodano ${amount} punktów użytkownikowi ${currentModalUser.username}`;
                break;
                
            case 'remove':
                endpoint = '/api/users/points/remove';
                body = { username: currentModalUser.username, points: amount };
                successMessage = `✅ Odjęto ${amount} punktów użytkownikowi ${currentModalUser.username}`;
                break;
                
            case 'clear':
                endpoint = '/api/users/points/remove';
                body = { username: currentModalUser.username, clear_all: true };
                successMessage = `✅ Wyczyszczono wszystkie punkty użytkownika ${currentModalUser.username}`;
                break;
                
            default:
                throw new Error('Nieznana akcja');
        }
        
        const response = await fetch(`${serverUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            addLog('success', successMessage);
            showNotification('success', successMessage);
            closePointsModal();
            await refreshRanking(); // Odśwież ranking
        } else {
            throw new Error(result.error || 'Nieznany błąd');
        }
        
    } catch (error) {
        addLog('error', `❌ Błąd: ${error.message}`);
        showNotification('error', `Błąd: ${error.message}`);
    } finally {
        hideLoading();
    }
}



// Zamknij modal po kliknięciu poza nim
document.addEventListener('click', function(event) {
    const modal = document.getElementById('pointsModal');
    if (event.target === modal) {
        closePointsModal();
    }
});

// Obsługa klawisza Escape dla modala
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closePointsModal();
    }
});

// Inicjalizacja logów
addLog('info', '🚀 Web Panel KranikBot uruchomiony');
addLog('info', '🔗 Sprawdzanie połączenia z serwerem...');