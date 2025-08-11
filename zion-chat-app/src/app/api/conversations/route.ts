import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

// GET: Obtener todas las conversaciones
export async function GET() {
  try {
    const db = await getDatabase()
    const conversations = await db.getConversations()
    
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Error al obtener las conversaciones' },
      { status: 500 }
    )
  }
}

// POST: Crear una nueva conversación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const db = await getDatabase()
    const conversationId = await db.createConversation(title)
    
    return NextResponse.json({ 
      id: conversationId,
      message: 'Conversación creada exitosamente' 
    })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Error al crear la conversación' },
      { status: 500 }
    )
  }
}
