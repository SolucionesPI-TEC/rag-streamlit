import sqlite3
from datetime import datetime

def get_db_connection():
    return sqlite3.connect('chat_history.db')

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Crear tabla de conversaciones
    c.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'Nueva conversación',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Crear tabla de mensajes
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def create_conversation(title=None):
    if title is None:
        title = f"Conversación {datetime.now().strftime('%d/%m/%Y')}"
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO conversations (title, created_at) VALUES (?, ?)',
              (title, datetime.now()))
    conversation_id = c.lastrowid
    conn.commit()
    conn.close()
    return conversation_id

def save_message(conversation_id, role, content):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
              (conversation_id, role, content, datetime.now()))
    conn.commit()
    conn.close()

def get_conversations():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC')
    conversations = c.fetchall()
    conn.close()
    return conversations

def get_messages(conversation_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at',
              (conversation_id,))
    messages = c.fetchall()
    conn.close()
    return [{"role": role, "content": content} for role, content in messages]

def delete_conversation(conversation_id):
    conn = get_db_connection()
    c = conn.cursor()
    
    # Primero borramos los mensajes asociados
    c.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
    
    # Luego borramos la conversación
    c.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
    
    conn.commit()
    conn.close() 