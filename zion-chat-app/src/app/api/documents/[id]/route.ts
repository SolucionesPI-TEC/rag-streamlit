import { NextRequest, NextResponse } from 'next/server'
import { getDocumentManager } from '@/lib/document-manager'

// DELETE: Eliminar un documento específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get('db')
    
    if (!dbName) {
      return NextResponse.json(
        { error: 'Database name is required' },
        { status: 400 }
      )
    }

    const documentManager = getDocumentManager()
    await documentManager.deleteDocument(dbName, id)
    
    return NextResponse.json({ 
      message: 'Documento eliminado exitosamente',
      documentId: id 
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el documento' },
      { status: 500 }
    )
  }
}

// GET: Obtener un documento específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get('db')
    
    if (!dbName) {
      return NextResponse.json(
        { error: 'Database name is required' },
        { status: 400 }
      )
    }

    const documentManager = getDocumentManager()
    const document = await documentManager.getDocument(dbName, id)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Error al obtener el documento' },
      { status: 500 }
    )
  }
}
