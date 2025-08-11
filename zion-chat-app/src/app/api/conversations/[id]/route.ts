import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

// DELETE: Eliminar una conversación específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    await db.deleteConversation(id)
    
    return NextResponse.json({ 
      message: 'Conversación eliminada exitosamente' 
    })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la conversación' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar el título de una conversación
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body

    const db = await getDatabase()
    await db.updateConversationTitle(id, title)
    
    return NextResponse.json({ 
      message: 'Título de conversación actualizado exitosamente' 
    })
  } catch (error) {
    console.error('Error updating conversation title:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el título de la conversación' },
      { status: 500 }
    )
  }
}
