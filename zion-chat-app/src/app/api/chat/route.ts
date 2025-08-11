import { NextRequest, NextResponse } from 'next/server'
import { ConversationalAgent, CAGAgent } from '@/lib/agents'
import { getDatabase } from '@/lib/database'
import { getDocumentManager } from '@/lib/document-manager'

// POST: Procesar un mensaje de chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      conversationId, 
      knowledgeBaseId,
      streaming = false 
    } = body

    // console.log('📝 API Chat recibió:', { message: message?.substring(0, 50), conversationId, knowledgeBaseId })

    if (!message || !conversationId) {
      console.error('❌ Faltan parámetros requeridos:', { message: !!message, conversationId: !!conversationId })
      return NextResponse.json(
        { error: 'Message y conversationId son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la base de conocimiento existe
    let selectedKb = null
    if (knowledgeBaseId) {
      try {
        const documentManager = getDocumentManager()
        const realDatabases = await documentManager.getDocumentDatabases()
        selectedKb = realDatabases.find(db => db.id === knowledgeBaseId)
        
        if (!selectedKb) {
          return NextResponse.json(
            { error: 'Base de conocimiento no válida' },
            { status: 400 }
          )
        }
      } catch (error) {
        console.error('Error validating knowledge base:', error)
        return NextResponse.json(
          { error: 'Error al validar base de conocimiento' },
          { status: 500 }
        )
      }
    }

    // Configurar agentes
    const conversationalAgent = new ConversationalAgent()
    const cagAgent = new CAGAgent()
    
    conversationalAgent.setConversationId(conversationId)
    conversationalAgent.setCagAgent(cagAgent)
    
    if (knowledgeBaseId) {
      cagAgent.setDatabase(knowledgeBaseId)
    }

    // Guardar mensaje del usuario
    const db = await getDatabase()
    // console.log('💾 Guardando mensaje del usuario:', { conversationId, tipo: typeof conversationId })
    await db.saveMessage(conversationId, 'user', message)

    // Procesar consulta con el agente
    const result = await conversationalAgent.processUserQuery(message)

    // Guardar respuesta del asistente
    const responseContent = JSON.stringify(result)
    await db.saveMessage(conversationId, 'assistant', responseContent)

    // Si se solicita streaming, configurar respuesta de streaming
    if (streaming) {
      // Para streaming, necesitaríamos usar ReadableStream
      // Por simplicidad, retornamos la respuesta completa por ahora
      return NextResponse.json({
        ...result,
        conversationId,
        messageId: Date.now().toString()
      })
    }

    return NextResponse.json({
      ...result,
      conversationId,
      messageId: Date.now().toString()
    })

  } catch (error) {
    console.error('Error processing chat message:', error)
    return NextResponse.json(
      { error: 'Error al procesar el mensaje' },
      { status: 500 }
    )
  }
}
