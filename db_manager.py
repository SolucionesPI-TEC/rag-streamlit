import sqlite3
from datetime import datetime
import json

from utils import logger

def get_db_connection():
    return sqlite3.connect('chat_history.db')

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Verificar si necesitamos recrear la tabla conversation_memory
    try:
        c.execute("SELECT memory_type FROM conversation_memory LIMIT 1")
    except sqlite3.OperationalError:
        # La tabla no existe o está mal formada, la recreamos
        c.execute("DROP TABLE IF EXISTS conversation_memory")
        
    # Crear o actualizar tablas
    c.execute('''CREATE TABLE IF NOT EXISTS conversations
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT DEFAULT 'Nueva conversación',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  conversation_id INTEGER,
                  role TEXT,
                  content TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (conversation_id) REFERENCES conversations (id))''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS conversation_memory
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  conversation_id INTEGER,
                  memory_type TEXT,
                  memory_data TEXT,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (conversation_id) REFERENCES conversations (id))''')
    
    # Crear índices para mejorar el rendimiento
    c.execute('''CREATE INDEX IF NOT EXISTS idx_conversation_memory 
                 ON conversation_memory(conversation_id, memory_type)''')
    
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
    """Elimina una conversación y toda su memoria asociada"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Comenzar una transacción
        c.execute('BEGIN TRANSACTION')
        
        # Borrar mensajes
        c.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
        
        # Borrar memoria
        c.execute('DELETE FROM conversation_memory WHERE conversation_id = ?', (conversation_id,))
        
        # Borrar conversación
        c.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
        
        # Confirmar cambios
        conn.commit()
    except Exception as e:
        # Si algo sale mal, revertir cambios
        conn.rollback()
        raise e
    finally:
        conn.close()

def save_memory(conversation_id: int, memory_type: str, memory_data: str):
    """Guarda o actualiza la memoria de una conversación"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Primero intentamos actualizar
        c.execute('''UPDATE conversation_memory 
                    SET memory_data = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE conversation_id = ? AND memory_type = ?''',
                 (memory_data, conversation_id, memory_type))
        
        # Si no se actualizó ninguna fila, insertamos una nueva
        if c.rowcount == 0:
            c.execute('''INSERT INTO conversation_memory 
                        (conversation_id, memory_type, memory_data)
                        VALUES (?, ?, ?)''',
                     (conversation_id, memory_type, memory_data))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error en save_memory: {str(e)}")
        raise

def get_memory(conversation_id: int, memory_type: str) -> str:
    """Obtiene la memoria de una conversación"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''SELECT memory_data 
                    FROM conversation_memory 
                    WHERE conversation_id = ? AND memory_type = ?
                    ORDER BY updated_at DESC
                    LIMIT 1''',
                 (conversation_id, memory_type))
        result = c.fetchone()
        conn.close()
        return result[0] if result else None
    except Exception as e:
        logger.error(f"Error en get_memory: {str(e)}")
        return None

def delete_conversation_memory(conversation_id: int):
    """Elimina toda la memoria asociada a una conversación"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('DELETE FROM conversation_memory WHERE conversation_id = ?', (conversation_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error en delete_conversation_memory: {str(e)}")
        raise 