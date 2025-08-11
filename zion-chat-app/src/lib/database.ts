import { Database } from 'sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// Interfaz para los mensajes
export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Interfaz para las conversaciones
export interface Conversation {
  id: string
  title: string
  created_at: string
}

// Interfaz para los resultados del agente
export interface AgentResult {
  response: string
  references?: string[]
  metrics?: Record<string, any>
}

class DatabaseManager {
  private db: Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'chat_history.db')
  }

  // Inicializar la base de datos
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        // Crear tablas si no existen
        this.createTables()
          .then(() => resolve())
          .catch(reject)
      })
    })
  }

  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const createConversationsTable = `
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `

      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
      `

      const createMemoryTable = `
        CREATE TABLE IF NOT EXISTS conversation_memory (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          memory_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
      `

      this.db.serialize(() => {
        this.db!.run(createConversationsTable)
        this.db!.run(createMessagesTable)
        this.db!.run(createMemoryTable, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    })
  }

  // Crear una nueva conversación
  async createConversation(title?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const conversationTitle = title || 'Nueva conversación'

      // La tabla existente usa INTEGER AUTOINCREMENT, así que no especificamos el ID
      const query = 'INSERT INTO conversations (title) VALUES (?)'
      this.db.run(query, [conversationTitle], function(err) {
        if (err) reject(err)
        else resolve(this.lastID!.toString()) // Convertir el INTEGER ID a string
      })
    })
  }

  // Obtener todas las conversaciones
  async getConversations(): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const query = 'SELECT * FROM conversations ORDER BY created_at DESC'
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows as Conversation[])
      })
    })
  }

  // Eliminar una conversación
  async deleteConversation(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const query = 'DELETE FROM conversations WHERE id = ?'
      this.db.run(query, [parseInt(conversationId)], function(err) {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Guardar un mensaje
  async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // La tabla existente usa INTEGER AUTOINCREMENT para id y conversation_id es INTEGER
      const query = 'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
      
      this.db.run(query, [parseInt(conversationId), role, content], function(err) {
        if (err) reject(err)
        else resolve(this.lastID!.toString()) // Convertir el INTEGER ID a string
      })
    })
  }

  // Obtener mensajes de una conversación
  async getMessages(conversationId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const query = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      this.db.all(query, [parseInt(conversationId)], (err, rows) => {
        if (err) reject(err)
        else resolve(rows as Message[])
      })
    })
  }

  // Actualizar el título de una conversación
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const query = 'UPDATE conversations SET title = ? WHERE id = ?'
      this.db.run(query, [title, parseInt(conversationId)], function(err) {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Cerrar la conexión de la base de datos
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve()
        return
      }

      this.db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

// Instancia singleton
let dbManager: DatabaseManager | null = null

export async function getDatabase(): Promise<DatabaseManager> {
  if (!dbManager) {
    dbManager = new DatabaseManager()
    await dbManager.init()
  }
  return dbManager
}

export default DatabaseManager
