import sqlite3
import os
import streamlit as st
from datetime import datetime
import shutil
from pathlib import Path

DATABASES_DIR = "databases"
DOCUMENTS_DIR = "documents"

def ensure_directories():
    """Asegura que existan los directorios necesarios"""
    for directory in [DATABASES_DIR, DOCUMENTS_DIR]:
        if not os.path.exists(directory):
            os.makedirs(directory)

def get_documents_folder(db_name):
    """Obtiene la ruta de la carpeta de documentos para una base de datos específica"""
    folder_path = os.path.join(DOCUMENTS_DIR, db_name)
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    return folder_path

def save_file(db_name, file):
    """Guarda el archivo en la carpeta correspondiente"""
    folder_path = get_documents_folder(db_name)
    file_path = os.path.join(folder_path, file.name)
    
    # Guardar el archivo
    with open(file_path, 'wb') as f:
        f.write(file.getvalue())
    
    return file_path

def delete_file(db_name, filename):
    """Elimina un archivo de la carpeta de documentos"""
    file_path = os.path.join(get_documents_folder(db_name), filename)
    if os.path.exists(file_path):
        os.remove(file_path)

def delete_document_folder(db_name):
    """Elimina la carpeta de documentos de una base de datos"""
    folder_path = get_documents_folder(db_name)
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)

def get_db_path(db_name):
    return os.path.join(DATABASES_DIR, f"{db_name}.db")

def init_document_db(db_name):
    ensure_directories()
    conn = sqlite3.connect(get_db_path(db_name))
    c = conn.cursor()
    
    # Crear tabla de documentos si no existe
    c.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            semantic_description TEXT,
            filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Verificar si la columna filename existe, si no, agregarla
    c.execute("PRAGMA table_info(documents)")
    columns = [column[1] for column in c.fetchall()]
    if 'filename' not in columns:
        c.execute('ALTER TABLE documents ADD COLUMN filename TEXT')
    
    conn.commit()
    conn.close()

def create_document_database(name, description=""):
    ensure_directories()
    
    # Guardar metadata de la base de datos
    conn = sqlite3.connect(os.path.join(DATABASES_DIR, 'document_metadata.db'))
    c = conn.cursor()
    
    # Crear tabla de metadata si no existe
    c.execute('''
        CREATE TABLE IF NOT EXISTS databases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    try:
        # Registrar la nueva base de datos
        c.execute('INSERT INTO databases (name, description) VALUES (?, ?)',
                 (name, description))
        db_id = c.lastrowid
        conn.commit()
        
        # Inicializar la base de datos de documentos
        init_document_db(name)
        
        return db_id
    except Exception as e:
        st.error(f"Error al crear la base de datos: {str(e)}")
        return None
    finally:
        conn.close()

def get_document_databases():
    ensure_directories()
    conn = sqlite3.connect(os.path.join(DATABASES_DIR, 'document_metadata.db'))
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS databases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('SELECT id, name, description, created_at FROM databases ORDER BY created_at DESC')
    databases = [
        {
            'id': row[0],
            'name': row[1],
            'description': row[2],
            'created_at': row[3]
        }
        for row in c.fetchall()
    ]
    conn.close()
    return databases

def delete_document_database(db_id):
    ensure_directories()
    
    conn = sqlite3.connect(os.path.join(DATABASES_DIR, 'document_metadata.db'))
    c = conn.cursor()
    c.execute('SELECT name FROM databases WHERE id = ?', (db_id,))
    result = c.fetchone()
    
    if result:
        db_name = result[0]
        db_path = get_db_path(db_name)
        
        # Eliminar el archivo de la base de datos si existe
        if os.path.exists(db_path):
            os.remove(db_path)
        
        # Eliminar la carpeta de documentos
        delete_document_folder(db_name)
        
        # Eliminar el registro de la metadata
        c.execute('DELETE FROM databases WHERE id = ?', (db_id,))
        conn.commit()
    
    conn.close()

def get_documents(db_name=None):
    ensure_directories()
    
    if db_name is None or db_name == "Todas las bases de datos":
        documents = []
        for db in get_document_databases():
            db_path = get_db_path(db['name'])
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                
                # Asegurarse de que la tabla existe y tiene la columna filename
                c.execute('''
                    CREATE TABLE IF NOT EXISTS documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        semantic_description TEXT,
                        filename TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Verificar si la columna filename existe, si no, agregarla
                c.execute("PRAGMA table_info(documents)")
                columns = [column[1] for column in c.fetchall()]
                if 'filename' not in columns:
                    c.execute('ALTER TABLE documents ADD COLUMN filename TEXT')
                    conn.commit()
                
                c.execute('''
                    SELECT id, title, content, semantic_description, filename, created_at
                    FROM documents
                    ORDER BY created_at DESC
                ''')
                documents.extend([
                    {
                        'id': row[0],
                        'title': row[1],
                        'content': row[2],
                        'semantic_description': row[3],
                        'filename': row[4],
                        'created_at': row[5],
                        'database_name': db['name']
                    }
                    for row in c.fetchall()
                ])
                conn.close()
        return documents
    else:
        db_path = get_db_path(db_name)
        if not os.path.exists(db_path):
            init_document_db(db_name)
            return []
        
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Asegurarse de que la tabla existe y tiene la columna filename
        c.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                semantic_description TEXT,
                filename TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Verificar si la columna filename existe, si no, agregarla
        c.execute("PRAGMA table_info(documents)")
        columns = [column[1] for column in c.fetchall()]
        if 'filename' not in columns:
            c.execute('ALTER TABLE documents ADD COLUMN filename TEXT')
            conn.commit()
        
        c.execute('''
            SELECT id, title, content, semantic_description, filename, created_at
            FROM documents
            ORDER BY created_at DESC
        ''')
        documents = [
            {
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'semantic_description': row[3],
                'filename': row[4],
                'created_at': row[5],
                'database_name': db_name
            }
            for row in c.fetchall()
        ]
        conn.close()
        return documents

def save_document(db_name, title, content, semantic_description, filename):
    ensure_directories()
    db_path = get_db_path(db_name)
    
    if not os.path.exists(db_path):
        init_document_db(db_name)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Modificar la tabla documents para incluir el nombre del archivo
    c.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            semantic_description TEXT,
            filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        INSERT INTO documents (title, content, semantic_description, filename)
        VALUES (?, ?, ?, ?)
    ''', (title, content, semantic_description, filename))
    
    conn.commit()
    conn.close()

def delete_document(db_name, doc_id):
    ensure_directories()
    conn = sqlite3.connect(get_db_path(db_name))
    c = conn.cursor()
    
    # Obtener el nombre del archivo antes de eliminar el registro
    c.execute('SELECT filename FROM documents WHERE id = ?', (doc_id,))
    result = c.fetchone()
    if result and result[0]:
        delete_file(db_name, result[0])
    
    c.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
    conn.commit()
    conn.close() 