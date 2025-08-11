import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

// GET: Obtener mensajes de una conversación específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    const messages = await db.getMessages(id)
    
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Error al obtener los mensajes' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo mensaje en una conversación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role y content son requeridos' },
        { status: 400 }
      )
    }

    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json(
        { error: 'Role debe ser "user" o "assistant"' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const messageId = await db.saveMessage(id, role, content)
    
    return NextResponse.json({ 
      id: messageId,
      message: 'Mensaje guardado exitosamente' 
    })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Error al guardar el mensaje' },
      { status: 500 }
    )
  }
}
