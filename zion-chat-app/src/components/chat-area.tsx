"use client"

import { Send, Paperclip, ChevronDown, MessageCircle, Search, User, Settings, Clock, BarChart3, Check, Bot, ArrowLeft } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import { useChat, type Conversation, type Message, type KnowledgeBase } from "@/lib/hooks/useChat"

interface ChatAreaProps {
  className?: string
  selectedChat?: Conversation | null
  onBackToEmpty?: () => void
}

interface UIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isUser: boolean
  knowledgeBase?: string
  references?: string[]
  metrics?: Record<string, any>
}

export function ChatArea({ className, selectedChat, onBackToEmpty }: ChatAreaProps) {
  const {
    messages: rawMessages,
    knowledgeBases,
    selectedKnowledgeBase,
    setSelectedKnowledgeBase,
    sendMessage,
    isLoading,
    error
  } = useChat()

  const [isKnowledgeDropdownOpen, setIsKnowledgeDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Transform backend messages to UI messages
  const messages: UIMessage[] = rawMessages.map(msg => {
    let content = msg.content
    let parsedContent = null
    
    try {
      parsedContent = JSON.parse(content)
    } catch {
      // Content is plain text
    }

    return {
      ...msg,
      isUser: msg.role === 'user',
      timestamp: new Date(msg.timestamp),
      content: parsedContent?.response || content,
      references: parsedContent?.references,
      metrics: parsedContent?.metrics
    }
  })

  // Map knowledge bases to UI format with icons
  const knowledgeBasesUI = knowledgeBases.map(kb => {
    // Asignar íconos y colores basados en el nombre de la base de datos
    let icon = User
    let color = "bg-gray-100 text-gray-600"
    
    const name = kb.name.toLowerCase()
    if (name.includes('promperu') || name.includes('exportacion')) {
      icon = BarChart3
      color = "bg-green-100 text-green-600"
    } else if (name.includes('rh') || name.includes('recursos') || name.includes('humanos')) {
      icon = User
      color = "bg-blue-100 text-blue-600"
    } else if (name.includes('ops') || name.includes('operaciones')) {
      icon = Settings
      color = "bg-purple-100 text-purple-600"
    } else if (name.includes('finance') || name.includes('finanzas')) {
      icon = Clock
      color = "bg-orange-100 text-orange-600"
    } else if (name.includes('tech') || name.includes('tecnologia')) {
      icon = BarChart3
      color = "bg-cyan-100 text-cyan-600"
    }
    
    return {
      ...kb,
      icon,
      color
    }
  })

  // Filter knowledge bases
  const filteredKnowledgeBases = knowledgeBasesUI.filter(kb => 
    kb.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    try {
      await sendMessage(message.trim())
      setMessage("")
    } catch (error) {
      console.error('Error sending message:', error)
      // Mostrar el error en la UI si es necesario
      // setError podría ser usado aquí para mostrar un mensaje de error
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getKnowledgeBaseName = (id: string) => {
    return knowledgeBasesUI.find(kb => kb.id === id)?.name
  }

  return (
    <div className={cn("flex-1 flex flex-col h-full bg-gray-50", className)}>
      {/* Chat Header - shown when there's a selected chat */}
      {selectedChat && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToEmpty}
              className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {selectedChat.title}
              </h1>
              <p className="text-sm text-gray-500">
                Última actividad: {formatTime(new Date(selectedChat.created_at))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {messages.length === 0 && !selectedChat ? (
          // Empty state - no chat selected
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Logo circular */}
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg border-4 border-white">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white"></div>
                </div>
              </div>
            </div>

            {/* Saludo y título */}
            <div className="text-center mb-8 max-w-lg">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Hola, Sara
              </h1>
              <h2 className="text-2xl font-semibold text-blue-600 mb-6">
                Pregunta con Precisión
              </h2>
              <p className="text-gray-600 text-base leading-relaxed">
                Selecciona una fuente de conocimiento antes de hacer tu pregunta para obtener respuestas
                basadas en documentos especializados.
              </p>
            </div>

            {/* No messages indicator */}
            <div className="w-full max-w-md mb-6">
              <div className="text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                No historial de chat
              </div>
            </div>
          </div>
        ) : (
          // Messages list
          <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-message-in",
                  msg.isUser ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* AI Avatar */}
                {!msg.isUser && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Message container */}
                <div className={cn(
                  "flex flex-col max-w-[70%]",
                  msg.isUser ? "items-end" : "items-start"
                )}>
                  {/* Message content */}
                  <div className={cn(
                          "rounded-2xl px-4 py-3 shadow-sm",
                          msg.isUser 
                            ? "bg-blue-600 text-white" 
                            : "bg-white text-gray-900 border border-gray-200"
                  )}>
                    {/* Knowledge base indicator */}
                    {msg.knowledgeBase && (
                      <div className={cn(
                        "text-xs mb-2 opacity-75",
                        msg.isUser ? "text-blue-100" : "text-gray-500"
                      )}>
                        📚 {getKnowledgeBaseName(msg.knowledgeBase)}
                      </div>
                    )}
                    
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {/* References */}
                    {msg.references && msg.references.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-600 mb-2">Referencias:</div>
                        {msg.references.map((ref, idx) => (
                          <div key={idx} className="text-xs text-gray-500 mb-1">
                            • {ref}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Metrics simplificados */}
                    {msg.metrics && Object.keys(msg.metrics).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {/* Solo mostrar base de datos si está seleccionada */}
                          {msg.metrics['base de datos'] && msg.metrics['base de datos'] !== 'no seleccionada' && (
                            <span className="flex items-center gap-1">
                              <span className="text-purple-600">📚</span>
                              <span className="font-medium">{msg.metrics['base de datos']}</span>
                            </span>
                          )}
                          
                          {/* Referencias si hay */}
                          {msg.metrics['referencias'] !== undefined && msg.metrics['referencias'] > 0 && (
                            <span>📄 {msg.metrics['referencias']} docs</span>
                          )}
                          
                          {/* Estado de éxito/error */}
                          {msg.metrics['estado'] && msg.metrics['estado'] !== 'éxito' && (
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              msg.metrics['estado'] === 'error' ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            )}>
                              {msg.metrics['estado'] === 'error' ? '❌' : '⚠️'} {msg.metrics['estado']}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className={cn(
                      "text-xs mt-2 opacity-60",
                      msg.isUser ? "text-blue-100" : "text-gray-400"
                    )}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>

                {/* User Avatar */}
                {msg.isUser && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-message-in">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">Escribiendo...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Input área */}
      <div className="bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Contenedor principal del chat con input y selector */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              
              {/* Input principal */}
              <div className="p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      placeholder="Mensaje ..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="w-full border-0 bg-transparent shadow-none focus:outline-none resize-none text-base text-gray-900 placeholder:text-gray-400 font-normal min-h-[24px] max-h-32 overflow-y-auto disabled:opacity-50"
                      rows={1}
                      style={{ lineHeight: '1.5' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                      disabled={isLoading}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isLoading}
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-10 w-10 rounded-full transition-all duration-200",
                        message.trim() && !isLoading
                          ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-lg hover:shadow-xl" 
                          : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                      )}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Botón de selección de base de conocimiento */}
              <div className="p-4">
                <div className="relative">
                  <Button 
                    onClick={() => setIsKnowledgeDropdownOpen(!isKnowledgeDropdownOpen)}
                    disabled={isLoading}
                    className={cn(
                      "gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg",
                      selectedKnowledgeBase 
                        ? "bg-green-600 text-white hover:bg-green-700" 
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded"></div>
                      </div>
                      {selectedKnowledgeBase 
                        ? getKnowledgeBaseName(selectedKnowledgeBase) 
                        : "Selecciona base de conocimiento"
                      }
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isKnowledgeDropdownOpen && "rotate-180"
                    )} />
                  </Button>

                  {/* Dropdown de bases de conocimiento */}
                  {isKnowledgeDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 w-80 animate-slideUp z-50">
                      {/* Campo de búsqueda */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-gray-50 border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Lista de opciones */}
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {/* Opción para limpiar selección */}
                        <button
                          onClick={() => {
                            setSelectedKnowledgeBase(null)
                            setIsKnowledgeDropdownOpen(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                            <MessageCircle className="h-5 w-5" />
                          </div>
                          <span className="flex-1 font-medium text-gray-900 text-sm">
                            Chat General
                          </span>
                          {!selectedKnowledgeBase && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </button>

                        {filteredKnowledgeBases.map((kb) => {
                          const Icon = kb.icon
                          const isSelected = selectedKnowledgeBase === kb.id
                          
                          return (
                            <button
                              key={kb.id}
                              onClick={() => {
                                setSelectedKnowledgeBase(kb.id)
                                setIsKnowledgeDropdownOpen(false)
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                            >
                              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", kb.color)}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">
                                {kb.name}
                                </div>
                                {kb.description && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {kb.description}
                                  </div>
                                )}
                                {typeof kb.documents === 'number' && (
                                  <div className="text-xs text-green-600 mt-0.5">
                                    📄 {kb.documents} documento{kb.documents !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="h-5 w-5 text-blue-600" />
                              )}
                            </button>
                          )
                        })}
                        
                        {filteredKnowledgeBases.length === 0 && (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            No se encontraron resultados
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
