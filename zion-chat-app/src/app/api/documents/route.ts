import { NextRequest, NextResponse } from 'next/server'
import { getDocumentManager } from '@/lib/document-manager'

// GET: Obtener documentos de una base de datos específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get('db')
    const search = searchParams.get('search')

    if (!dbName) {
      return NextResponse.json(
        { error: 'Database name is required' },
        { status: 400 }
      )
    }

    const documentManager = getDocumentManager()
    
    // Obtener documentos reales
    let documents = []
    if (dbName === 'all') {
      // Obtener todas las bases de datos y sus documentos
      const databases = await documentManager.getDocumentDatabases()
      for (const db of databases) {
        const dbDocs = await documentManager.getDocuments(db.name)
        documents.push(...dbDocs)
      }
    } else {
      documents = await documentManager.getDocuments(dbName)
    }

    // Filtrar por búsqueda si se proporciona
    let filteredDocuments = documents
    if (search) {
      const searchLower = search.toLowerCase()
      filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.semantic_description.toLowerCase().includes(searchLower) ||
        doc.content.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      documents: filteredDocuments,
      total: filteredDocuments.length,
      database: dbName
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Error al obtener los documentos' },
      { status: 500 }
    )
  }
}

// POST: Subir un nuevo documento (simulado por ahora)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const dbName = formData.get('database') as string
    const title = formData.get('title') as string

    if (!file || !dbName) {
      return NextResponse.json(
        { error: 'File and database name are required' },
        { status: 400 }
      )
    }

    // TODO: Implementar la subida real de archivos
    // Por ahora simular la respuesta
    const documentId = Date.now().toString()
    const mockDocument = {
      id: documentId,
      title: title || file.name,
      filename: file.name,
      database_name: dbName,
      content: `Contenido extraído del archivo ${file.name}`,
      semantic_description: `Descripción semántica generada automáticamente para ${file.name}`,
      created_at: new Date().toISOString(),
      file_size: file.size,
      file_type: file.type
    }

    return NextResponse.json({
      message: 'Documento subido exitosamente',
      document: mockDocument
    })

  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Error al subir el documento' },
      { status: 500 }
    )
  }
}