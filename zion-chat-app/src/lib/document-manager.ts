import { Database } from 'sqlite3'
import path from 'path'
import fs from 'fs'

// Interfaz para los documentos
export interface DocumentInfo {
  id: string
  title: string
  filename: string
  database_name: string
  content: string
  semantic_description: string
  created_at: string
  file_size: number
  file_type: string
}

// Interfaz para las bases de datos de documentos
export interface DocumentDatabase {
  id: string
  name: string
  description: string
  created_at: string
}

class DocumentManager {
  private metadataDbPath: string
  private documentsPath: string

  constructor() {
    this.metadataDbPath = path.join(process.cwd(), 'data', 'databases', 'document_metadata.db')
    this.documentsPath = path.join(process.cwd(), 'data', 'documents')
  }

  // Obtener bases de datos de documentos disponibles
  async getDocumentDatabases(): Promise<DocumentDatabase[]> {
    return new Promise((resolve, reject) => {
      const db = new Database(this.metadataDbPath, (err) => {
        if (err) {
          console.error('Error connecting to metadata database:', err)
          // Si no existe la DB de metadatos, buscar archivos .db físicos
          try {
            const databasesPath = path.join(process.cwd(), 'data', 'databases')
            const dbFiles = fs.readdirSync(databasesPath)
              .filter(file => file.endsWith('.db') && file !== 'document_metadata.db')
              .map(file => ({
                id: path.basename(file, '.db'),
                name: path.basename(file, '.db'),
                description: `Base de conocimiento de ${path.basename(file, '.db')}`,
                created_at: new Date().toISOString()
              }))
            
            if (dbFiles.length > 0) {
              resolve(dbFiles)
            } else {
              resolve([{
                id: 'PROMPERU',
                name: 'PROMPERU',
                description: 'Base de conocimiento de PROMPERU',
                created_at: new Date().toISOString()
              }])
            }
          } catch (fsError) {
            console.error('Error reading database files:', fsError)
            resolve([{
              id: 'PROMPERU',
              name: 'PROMPERU',
              description: 'Base de conocimiento de PROMPERU',
              created_at: new Date().toISOString()
            }])
          }
          return
        }

        const query = 'SELECT * FROM databases ORDER BY created_at DESC'
        db.all(query, [], (err, rows) => {
          db.close()
          
          if (err) {
            console.error('Error querying document databases:', err)
            // Fallback a búsqueda de archivos físicos
            try {
              const databasesPath = path.join(process.cwd(), 'data', 'databases')
              const dbFiles = fs.readdirSync(databasesPath)
                .filter(file => file.endsWith('.db') && file !== 'document_metadata.db')
                .map(file => ({
                  id: path.basename(file, '.db'),
                  name: path.basename(file, '.db'),
                  description: `Base de conocimiento de ${path.basename(file, '.db')}`,
                  created_at: new Date().toISOString()
                }))
              
              resolve(dbFiles.length > 0 ? dbFiles : [{
                id: 'PROMPERU',
                name: 'PROMPERU',
                description: 'Base de conocimiento de PROMPERU',
                created_at: new Date().toISOString()
              }])
            } catch (fsError) {
              resolve([{
                id: 'PROMPERU',
                name: 'PROMPERU', 
                description: 'Base de conocimiento de PROMPERU',
                created_at: new Date().toISOString()
              }])
            }
          } else {
            // Mapear rows a la interfaz correcta
            const mappedRows = (rows as any[]).map(row => ({
              id: row.name,
              name: row.name,
              description: row.description || `Base de conocimiento de ${row.name}`,
              created_at: row.created_at || new Date().toISOString()
            }))
            resolve(mappedRows)
          }
        })
      })
    })
  }

  // Obtener documentos de una base de datos específica
  async getDocuments(databaseName: string): Promise<DocumentInfo[]> {
    return new Promise((resolve, reject) => {
      // Primero intentar obtener de la base de datos específica
      const dbPath = path.join(process.cwd(), 'data', 'databases', `${databaseName}.db`)
      
      if (!fs.existsSync(dbPath)) {
        console.log(`Database ${databaseName}.db not found, returning empty array`)
        resolve([])
        return
      }

      const db = new Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err)
          resolve([])
          return
        }

        const query = 'SELECT * FROM documents ORDER BY created_at DESC'
        db.all(query, [], (err, rows) => {
          db.close()
          
          if (err) {
            console.error('Error querying documents:', err)
            resolve([])
          } else {
            // Enriquecer con información del archivo físico
            const documents = (rows as any[]).map(doc => {
              const filePath = path.join(this.documentsPath, databaseName, doc.filename || `${doc.title}.txt`)
              let fileSize = 0
              let fileType = 'text/plain'

              try {
                if (fs.existsSync(filePath)) {
                  const stats = fs.statSync(filePath)
                  fileSize = stats.size
                  
                  // Determinar tipo de archivo por extensión
                  const ext = path.extname(filePath).toLowerCase()
                  switch (ext) {
                    case '.pdf':
                      fileType = 'application/pdf'
                      break
                    case '.docx':
                      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                      break
                    case '.txt':
                      fileType = 'text/plain'
                      break
                    case '.md':
                      fileType = 'text/markdown'
                      break
                    default:
                      fileType = 'application/octet-stream'
                  }
                }
              } catch (error) {
                console.error('Error reading file stats:', error)
              }

              return {
                id: doc.id.toString(),
                title: doc.title,
                filename: doc.filename || `${doc.title}.txt`,
                database_name: databaseName,
                content: doc.content || '',
                semantic_description: doc.semantic_description || 'Sin descripción disponible',
                created_at: doc.created_at || new Date().toISOString(),
                file_size: fileSize,
                file_type: fileType
              }
            })

            resolve(documents)
          }
        })
      })
    })
  }

  // Obtener un documento específico
  async getDocument(databaseName: string, documentId: string): Promise<DocumentInfo | null> {
    const documents = await this.getDocuments(databaseName)
    return documents.find(doc => doc.id === documentId) || null
  }

  // Eliminar un documento
  async deleteDocument(databaseName: string, documentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(process.cwd(), 'data', 'databases', `${databaseName}.db`)
      
      if (!fs.existsSync(dbPath)) {
        reject(new Error('Database not found'))
        return
      }

      const db = new Database(dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        // Primero obtener información del documento para eliminar el archivo físico
        const selectQuery = 'SELECT filename FROM documents WHERE id = ?'
        db.get(selectQuery, [documentId], (err, row: any) => {
          if (err) {
            db.close()
            reject(err)
            return
          }

          if (row && row.filename) {
            const filePath = path.join(this.documentsPath, databaseName, row.filename)
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
              }
            } catch (error) {
              console.error('Error deleting physical file:', error)
            }
          }

          // Eliminar de la base de datos
          const deleteQuery = 'DELETE FROM documents WHERE id = ?'
          db.run(deleteQuery, [documentId], function(err) {
            db.close()
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      })
    })
  }

  // Obtener archivo físico para descarga
  getDocumentFile(databaseName: string, filename: string): Buffer | null {
    try {
      const filePath = path.join(this.documentsPath, databaseName, filename)
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath)
      }
    } catch (error) {
      console.error('Error reading document file:', error)
    }
    return null
  }

  // Listar archivos disponibles en una carpeta
  listFiles(databaseName: string): string[] {
    try {
      const folderPath = path.join(this.documentsPath, databaseName)
      if (fs.existsSync(folderPath)) {
        return fs.readdirSync(folderPath).filter(file => {
          // Filtrar solo archivos, no directorios
          const filePath = path.join(folderPath, file)
          return fs.statSync(filePath).isFile()
        })
      }
    } catch (error) {
      console.error('Error listing files:', error)
    }
    return []
  }
}

// Instancia singleton
let documentManager: DocumentManager | null = null

export function getDocumentManager(): DocumentManager {
  if (!documentManager) {
    documentManager = new DocumentManager()
  }
  return documentManager
}

export default DocumentManager
