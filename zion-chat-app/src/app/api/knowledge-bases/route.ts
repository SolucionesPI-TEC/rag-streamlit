import { NextResponse } from 'next/server'
import { getDocumentManager } from '@/lib/document-manager'

// GET: Obtener todas las bases de conocimiento disponibles
export async function GET() {
  try {
    const documentManager = getDocumentManager()
    const realDatabases = await documentManager.getDocumentDatabases()
    
    // Contar documentos para cada base de datos
    const databasesWithStats = await Promise.all(
      realDatabases.map(async (db) => {
        try {
          const documents = await documentManager.getDocuments(db.name)
          return {
            id: db.id,
            name: db.name,
            description: db.description,
            documents: documents.length,
            created_at: db.created_at
          }
        } catch (error) {
          console.error(`Error counting documents for ${db.name}:`, error)
          return {
            id: db.id,
            name: db.name,
            description: db.description,
            documents: 0,
            created_at: db.created_at
          }
        }
      })
    )
    
    return NextResponse.json(databasesWithStats)
  } catch (error) {
    console.error('Error fetching knowledge bases:', error)
    return NextResponse.json(
      { error: 'Error al obtener las bases de conocimiento' },
      { status: 500 }
    )
  }
}
