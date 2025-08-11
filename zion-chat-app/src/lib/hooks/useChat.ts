import { useState, useEffect, useCallback } from 'react'

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
}

export interface ChatResponse {
  response: string
  references?: string[]
  metrics?: Record<string, any>
  conversationId: string
  messageId: string
}

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: string[]
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar conversaciones al inicializar
  useEffect(() => {
    loadConversations()
    loadKnowledgeBases()
  }, [])

  // Cargar mensajes cuando cambia la conversación actual
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id)
    } else {
      setMessages([])
    }
  }, [currentConversation])

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations')
      if (!response.ok) throw new Error('Error al cargar conversaciones')
      const data = await response.json()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!response.ok) throw new Error('Error al cargar mensajes')
      const data = await response.json()
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [])

  const loadKnowledgeBases = useCallback(async () => {
    try {
      const response = await fetch('/api/knowledge-bases')
      if (!response.ok) throw new Error('Error al cargar bases de conocimiento')
      const data = await response.json()
      setKnowledgeBases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }, [])

  const createConversation = useCallback(async (title?: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Nueva conversación' })
      })
      
      if (!response.ok) throw new Error('Error al crear conversación')
      
      const data = await response.json()
      
      // Crear el objeto de conversación localmente para evitar dependencias circulares
      const newConversation: Conversation = {
        id: data.id,
        title: title || 'Nueva conversación',
        created_at: new Date().toISOString()
      }
      
      // Actualizar la lista de conversaciones y establecer como actual
      setConversations(prev => [newConversation, ...prev])
      setCurrentConversation(newConversation)
      
      return data.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Error al eliminar conversación')
      
      // Si la conversación eliminada era la actual, resetear
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
      }
      
      await loadConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversation, loadConversations])

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      
      if (!response.ok) throw new Error('Error al actualizar título')
      
      await loadConversations()
      
      // Actualizar la conversación actual si es la misma
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title } : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversation, loadConversations])

  const sendMessage = useCallback(async (message: string): Promise<ChatResponse> => {
    // Si no hay conversación activa, crear una nueva automáticamente
    let conversationToUse = currentConversation
    if (!conversationToUse) {
      try {
        const newConversationId = await createConversation()
        console.log('✅ Conversación creada con ID:', newConversationId)
        // Crear el objeto de conversación para usar inmediatamente
        conversationToUse = {
          id: newConversationId,
          title: 'Nueva conversación',
          created_at: new Date().toISOString()
        }
      } catch (error) {
        console.error('❌ Error creando conversación:', error)
        throw new Error('No se pudo crear una conversación')
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      // Optimistically add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        conversation_id: conversationToUse.id,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      const requestData = {
        message,
        conversationId: conversationToUse.id,
        knowledgeBaseId: selectedKnowledgeBase,
        streaming: false
      }
      // console.log('📤 Enviando mensaje:', requestData)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error en API chat:', errorData)
        throw new Error(errorData.error || `Error ${response.status}: Error al enviar mensaje`)
      }
      
      const chatResponse: ChatResponse = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: chatResponse.messageId,
        conversation_id: conversationToUse.id,
        role: 'assistant',
        content: JSON.stringify({
          response: chatResponse.response,
          references: chatResponse.references,
          metrics: chatResponse.metrics
        }),
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Si se creó una nueva conversación, actualizarla en el estado
      if (!currentConversation) {
        setCurrentConversation(conversationToUse)
      }

      return chatResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversation, selectedKnowledgeBase, createConversation])

  const selectConversation = useCallback((conversation: Conversation) => {
    setCurrentConversation(conversation)
    setError(null)
  }, [])

  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null)
    setMessages([])
  }, [])

  return {
    // State
    conversations,
    currentConversation,
    messages,
    knowledgeBases,
    selectedKnowledgeBase,
    isLoading,
    error,

    // Actions
    createConversation,
    deleteConversation,
    updateConversationTitle,
    sendMessage,
    selectConversation,
    clearCurrentConversation,
    setSelectedKnowledgeBase,
    loadConversations,
    loadMessages,
    setError
  }
}
