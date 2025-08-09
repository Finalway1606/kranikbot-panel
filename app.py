#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌐 KRANIK BOT - Webowy Panel Kontrolny
Flask aplikacja do zdalnego zarządzania botami
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_socketio import SocketIO, emit
from werkzeug.security import check_password_hash, generate_password_hash
import os
import sys
import subprocess
import psutil
import sqlite3
import json
import zipfile
from datetime import datetime, timedelta
import threading
import time
from functools import wraps

# Dodaj ścieżkę do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from core.user_database import UserDatabase
except ImportError:
    UserDatabase = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kranikbot-web-panel-secret-key-2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# Default admin credentials
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin'

# Konfiguracja
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(PROJECT_ROOT, 'data', 'users.db')

# Globalne zmienne stanu
bot_processes = {
    'twitch': None,
    'discord': None
}
bot_status = {
    'twitch': False,
    'discord': False
}

# Database connection
user_db = None

def init_database():
    """Initialize database connection"""
    global user_db
    try:
        if UserDatabase:
            user_db = UserDatabase()
            print("✅ Database connection established")
        else:
            print("❌ UserDatabase not available")
    except Exception as e:
        print(f"❌ Database initialization error: {e}")

# Initialize database on startup
init_database()

def require_login(f):
    """Decorator requiring login"""
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def log_action(message):
    """Logowanie akcji z timestampem"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    # Wyślij log do wszystkich połączonych klientów
    socketio.emit('new_log', {'message': log_entry})

@app.route('/')
def index():
    """Main page - redirect to login or dashboard"""
    if 'logged_in' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            session['username'] = username
            log_action(f"🔐 Użytkownik {username} zalogował się do panelu")
            flash('Pomyślnie zalogowano!', 'success')
            return redirect(url_for('dashboard'))
        else:
            log_action(f"❌ Nieudana próba logowania: {username}")
            flash('Nieprawidłowe dane logowania!', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@require_login
def logout():
    """Logout"""
    username = session.get('username', 'Unknown')
    log_action(f"🔐 Użytkownik {username} wylogował się z panelu")
    session.clear()
    flash('Zostałeś wylogowany!', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@require_login
def dashboard():
    """Main dashboard"""
    return render_template('dashboard.html')

@app.route('/api/status')
@require_login
def api_status():
    """API - status botów"""
    # Sprawdź rzeczywisty status procesów
    check_bot_processes()
    
    return jsonify({
        'twitch': bot_status['twitch'],
        'discord': bot_status['discord'],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/stats')
@require_login
def api_stats():
    """API - statystyki bota"""
    if not user_db:
        return jsonify({'error': 'Brak połączenia z bazą danych'})
    
    try:
        with user_db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Podstawowe statystyki
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT SUM(points) FROM users")
            total_points = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT SUM(message_count) FROM users")
            total_messages = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT AVG(points) FROM users WHERE points > 0")
            avg_points = cursor.fetchone()[0] or 0
            
            # Top użytkownicy
            cursor.execute("""
                SELECT username, points, message_count, last_seen 
                FROM users 
                ORDER BY points DESC 
                LIMIT 10
            """)
            top_users = cursor.fetchall()
            
            return jsonify({
                'total_users': total_users,
                'total_points': int(total_points),
                'total_messages': int(total_messages),
                'avg_points': round(float(avg_points), 2),
                'top_users': [
                    {
                        'username': user[0],
                        'points': user[1],
                        'messages': user[2],
                        'last_seen': user[3]
                    } for user in top_users
                ]
            })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/leaderboard')
@require_login
def api_leaderboard():
    """API - pełny ranking"""
    if not user_db:
        return jsonify({'error': 'Brak połączenia z bazą danych'})
    
    try:
        with user_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT username, points, message_count, last_seen, is_follower
                FROM users 
                ORDER BY points DESC 
                LIMIT 100
            """)
            users = cursor.fetchall()
            
            leaderboard = []
            for i, user in enumerate(users, 1):
                leaderboard.append({
                    'rank': i,
                    'username': user[0],
                    'points': user[1],
                    'messages': user[2],
                    'last_seen': user[3],
                    'is_follower': bool(user[4])
                })
            
            return jsonify(leaderboard)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/bot/<bot_type>/<action>', methods=['POST'])
@require_login
def api_bot_control(bot_type, action):
    """API - kontrola botów"""
    if bot_type not in ['twitch', 'discord']:
        return jsonify({'error': 'Nieprawidłowy typ bota'}), 400
    
    if action not in ['start', 'stop', 'restart']:
        return jsonify({'error': 'Nieprawidłowa akcja'}), 400
    
    try:
        if action == 'start':
            result = start_bot(bot_type)
        elif action == 'stop':
            result = stop_bot(bot_type)
        elif action == 'restart':
            result = restart_bot(bot_type)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/points/add', methods=['POST'])
@require_login
def api_add_points():
    """API - dodawanie punktów"""
    data = request.get_json()
    username = data.get('username')
    points = data.get('points')
    
    if not username or not points:
        return jsonify({'error': 'Brak wymaganych danych'}), 400
    
    try:
        points = int(points)
    except ValueError:
        return jsonify({'error': 'Punkty muszą być liczbą'}), 400
    
    if not user_db:
        return jsonify({'error': 'Brak połączenia z bazą danych'}), 500
    
    try:
        with user_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users SET points = points + ? WHERE username = ?
            """, (points, username))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Użytkownik nie istnieje'}), 404
            
            conn.commit()
            log_action(f"💎 Dodano {points} punktów użytkownikowi {username}")
            return jsonify({'success': True, 'message': f'Dodano {points} punktów'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/points/clear', methods=['POST'])
@require_login
def api_clear_points():
    """API - czyszczenie punktów"""
    data = request.get_json()
    clear_type = data.get('type', 'all')
    
    if not user_db:
        return jsonify({'error': 'Brak połączenia z bazą danych'}), 500
    
    try:
        with user_db.get_connection() as conn:
            cursor = conn.cursor()
            
            if clear_type == 'all':
                cursor.execute("UPDATE users SET points = 0")
                affected = cursor.rowcount
                log_action(f"🗑️ Wyczyszczono punkty wszystkich użytkowników ({affected})")
            elif clear_type == 'non_followers':
                cursor.execute("UPDATE users SET points = 0 WHERE is_follower = 0")
                affected = cursor.rowcount
                log_action(f"🗑️ Wyczyszczono punkty nie-followerów ({affected})")
            else:
                return jsonify({'error': 'Nieprawidłowy typ czyszczenia'}), 400
            
            conn.commit()
            return jsonify({'success': True, 'affected': affected})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def start_bot(bot_type):
    """Uruchomienie bota"""
    if bot_status[bot_type]:
        return {'error': f'{bot_type.title()} bot już działa'}
    
    try:
        if bot_type == 'twitch':
            script_path = os.path.join(PROJECT_ROOT, 'core', 'testBot.py')
        else:  # discord
            script_path = os.path.join(PROJECT_ROOT, 'core', 'discord_bot_standalone.py')
        
        if not os.path.exists(script_path):
            return {'error': f'Plik {script_path} nie istnieje'}
        
        # Uruchom proces
        process = subprocess.Popen([
            sys.executable, script_path
        ], cwd=PROJECT_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        bot_processes[bot_type] = process
        bot_status[bot_type] = True
        
        log_action(f"🚀 {bot_type.title()} Bot uruchomiony (PID: {process.pid})")
        return {'success': True, 'message': f'{bot_type.title()} Bot uruchomiony'}
    
    except Exception as e:
        log_action(f"❌ Błąd uruchamiania {bot_type} bota: {e}")
        return {'error': str(e)}

def is_bot_running(bot_type):
    """Check if bot is running"""
    try:
        if bot_type == 'twitch':
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if proc.info['cmdline'] and 'testBot.py' in ' '.join(proc.info['cmdline']):
                    return True
        elif bot_type == 'discord':
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if proc.info['cmdline'] and ('discord_bot.py' in ' '.join(proc.info['cmdline']) or 
                                           'discord_bot_standalone.py' in ' '.join(proc.info['cmdline'])):
                    return True
        return False
    except:
        return False

def stop_bot(bot_type):
    """Zatrzymanie bota"""
    if not bot_status[bot_type]:
        return {'error': f'{bot_type.title()} bot nie działa'}
    
    try:
        process = bot_processes[bot_type]
        if process and process.poll() is None:
            process.terminate()
            process.wait(timeout=5)
        
        bot_processes[bot_type] = None
        bot_status[bot_type] = False
        
        log_action(f"⏹️ {bot_type.title()} Bot zatrzymany")
        return {'success': True, 'message': f'{bot_type.title()} Bot zatrzymany'}
    
    except Exception as e:
        log_action(f"❌ Błąd zatrzymywania {bot_type} bota: {e}")
        return {'error': str(e)}

def restart_bot(bot_type):
    """Restart bota"""
    stop_result = stop_bot(bot_type)
    time.sleep(2)
    start_result = start_bot(bot_type)
    
    if start_result.get('success'):
        log_action(f"🔄 {bot_type.title()} Bot zrestartowany")
        return {'success': True, 'message': f'{bot_type.title()} Bot zrestartowany'}
    else:
        return start_result

def check_bot_processes():
    """Sprawdzenie statusu procesów botów"""
    for bot_type in ['twitch', 'discord']:
        process = bot_processes[bot_type]
        if process and process.poll() is not None:
            # Proces się zakończył
            bot_processes[bot_type] = None
            bot_status[bot_type] = False
            log_action(f"⚠️ {bot_type.title()} Bot został nieoczekiwanie zatrzymany")

def monitor_bots():
    """Monitorowanie botów w tle"""
    while True:
        try:
            check_bot_processes()
            time.sleep(5)
        except Exception as e:
            print(f"Błąd monitorowania: {e}")
            time.sleep(10)

# Uruchom monitoring w tle
monitor_thread = threading.Thread(target=monitor_bots, daemon=True)
monitor_thread.start()

@socketio.on('connect')
def handle_connect():
    """Obsługa połączenia WebSocket"""
    if 'logged_in' not in session:
        return False
    print(f"Klient połączony: {request.sid}")
    emit('connected', {'message': 'Połączono z panelem kontrolnym'})

@socketio.on('disconnect')
def handle_disconnect():
    """Obsługa rozłączenia WebSocket"""
    print(f"Klient rozłączony: {request.sid}")

if __name__ == '__main__':
    print("🌐 Uruchamianie webowego panelu kontrolnego...")
    print("📍 Adres: http://localhost:5000")
    print("🔐 Login: admin / admin")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)