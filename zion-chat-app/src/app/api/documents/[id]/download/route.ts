import { NextRequest, NextResponse } from 'next/server'
import { getDocumentManager } from '@/lib/document-manager'

// GET: Descargar un archivo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get('db')
    const filename = searchParams.get('filename')
    
    if (!dbName || !filename) {
      return NextResponse.json(
        { error: 'Database name and filename are required' },
        { status: 400 }
      )
    }

    const documentManager = getDocumentManager()
    const fileBuffer = documentManager.getDocumentFile(dbName, filename)
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Determinar el tipo de contenido basado en la extensión
    const getContentType = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase()
      switch (ext) {
        case 'pdf':
          return 'application/pdf'
        case 'docx':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        case 'txt':
          return 'text/plain'
        case 'md':
          return 'text/markdown'
        default:
          return 'application/octet-stream'
      }
    }

    // Crear respuesta con el archivo
    const response = new NextResponse(fileBuffer)
    response.headers.set('Content-Type', getContentType(filename))
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    
    return response
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Error al descargar el archivo' },
      { status: 500 }
    )
  }
}
