"use client"

import { Plus, Search, MessageCircle, Clock, FileText, Paperclip, MoreVertical, Edit3, Trash2, Briefcase } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { type Conversation } from "@/lib/hooks/useChat"

interface SidebarProps {
  className?: string
  conversations?: Conversation[]
  onNewChat?: () => void
  onChatSelect?: (chat: Conversation) => void
  onDeleteChat?: (conversationId: string) => void
  onRenameChat?: (conversationId: string, newTitle: string) => void
  selectedChatId?: string | null
  onTabChange?: (tab: string) => void
  activeTab?: string
  isLoading?: boolean
}

export function Sidebar({ 
  className, 
  conversations = [], 
  onNewChat, 
  onChatSelect, 
  onDeleteChat,
  onRenameChat,
  selectedChatId, 
  onTabChange, 
  activeTab = "chats",
  isLoading = false
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState<string>("")
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>("")

  const sidebarTabs = [
    { id: "chats", icon: MessageCircle, label: "Chats" },
    { id: "projects", icon: Briefcase, label: "Proyectos" },
    { id: "files", icon: FileText, label: "Archivos" },
    { id: "attachments", icon: Paperclip, label: "Adjuntos" }
  ]

  // Separar conversaciones por fecha
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffDays === 2) {
      return 'Ayer'
    } else if (diffDays <= 7) {
      return `Hace ${diffDays - 1} días`
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayChats = conversations.filter(conv => {
    const convDate = new Date(conv.created_at)
    convDate.setHours(0, 0, 0, 0)
    return convDate.getTime() === today.getTime()
  })

  const recentChats = conversations.filter(conv => {
    const convDate = new Date(conv.created_at)
    convDate.setHours(0, 0, 0, 0)
    return convDate.getTime() < today.getTime()
  })

  // Data de ejemplo para proyectos (preparada para integración con API)
  const projectCategories = [
    { id: "recursos-humanos", name: "Recursos Humanos", color: "bg-blue-100 text-blue-800" },
    { id: "soporte-atencion", name: "Soporte y Atención", color: "bg-green-100 text-green-800" },
    { id: "ventas-marketing", name: "Ventas y Marketing", color: "bg-purple-100 text-purple-800" },
    { id: "tecnologia-desarrollo", name: "Tecnología y Desarrollo", color: "bg-orange-100 text-orange-800" },
  ]

  const projects = [
    {
      id: 1,
      title: "Modelos matemáticos para el cambio climático",
      category: "recursos-humanos",
      date: "12 de marzo",
      status: "active"
    },
    {
      id: 2,
      title: "Sistema de gestión de recursos",
      category: "tecnologia-desarrollo",
      date: "11 de marzo",
      status: "active"
    },
    {
      id: 3,
      title: "Análisis de satisfacción del cliente",
      category: "soporte-atencion",
      date: "10 de marzo",
      status: "completed"
    },
    {
      id: 4,
      title: "Campaña de marketing digital",
      category: "ventas-marketing",
      date: "9 de marzo",
      status: "in-progress"
    },
    {
      id: 5,
      title: "Optimización de procesos internos",
      category: "recursos-humanos",
      date: "8 de marzo",
      status: "active"
    }
  ]

  const handleNewChat = () => {
    if (deleteConfirmId) return // Bloquear si está en modo eliminar
    onNewChat?.()
  }

  const handleChatSelect = (chat: Conversation) => {
    if (deleteConfirmId || renameId) return // Bloquear si está en modo eliminar o renombrar
    onChatSelect?.(chat)
  }

  const handleTabChange = (tabId: string) => {
    if (deleteConfirmId || renameId) return // Bloquear si está en modo eliminar o renombrar
    onTabChange?.(tabId)
  }

  const handleMenuToggle = (chatId: string) => {
    if (deleteConfirmId || renameId) return // Bloquear si está en modo eliminar o renombrar
    setOpenMenuId(openMenuId === chatId ? null : chatId)
  }

  const handleRenameChat = (chatId: string, currentTitle: string) => {
    if (deleteConfirmId) return // Bloquear si está en modo eliminar
    setRenameId(chatId)
    setRenameValue(currentTitle)
    setOpenMenuId(null)
  }

  const confirmRenameChat = async () => {
    if (renameId && renameValue.trim() && onRenameChat) {
      try {
        await onRenameChat(renameId, renameValue.trim())
        setRenameId(null)
        setRenameValue("")
      } catch (error) {
        console.error('Error renaming chat:', error)
      }
    }
  }

  const cancelRename = () => {
    setRenameId(null)
    setRenameValue("")
  }

  const handleDeleteChat = (chatId: string) => {
    const chat = [...todayChats, ...recentChats].find(c => c.id === chatId)
    setDeleteConfirmId(chatId)
    setDeleteConfirmTitle(chat?.title || "")
    setOpenMenuId(null)
  }

  const confirmDeleteChat = async (chatId: string) => {
    if (onDeleteChat) {
      try {
        await onDeleteChat(chatId)
        setDeleteConfirmId(null)
        setDeleteConfirmTitle("")
      } catch (error) {
        console.error('Error deleting chat:', error)
      }
    }
  }

  const cancelDeleteChat = () => {
    setDeleteConfirmId(null)
    setDeleteConfirmTitle("")
  }

  // Cancelar todas las acciones cuando el sidebar se oculta
  useEffect(() => {
    if (!isExpanded) {
      setOpenMenuId(null)
      setDeleteConfirmId(null)
    }
  }, [isExpanded])

  // Cerrar menú al hacer clic fuera (solo si no está en modo eliminar)
  useEffect(() => {
    const handleClickOutside = () => {
      if (!deleteConfirmId) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId !== null && !deleteConfirmId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId, deleteConfirmId])

  return (
    <>
      {/* Modal de confirmación de borrado - Fixed overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay de fondo */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={cancelDeleteChat} />
          
          {/* Modal de confirmación */}
          <div className="relative w-96 bg-white rounded-xl shadow-2xl p-6 mx-4">
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">¿Eliminar conversación?</h4>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-gray-700 line-clamp-2">&ldquo;{deleteConfirmTitle}&rdquo;</p>
              </div>
              <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelDeleteChat}
                className="flex-1 h-10"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => confirmDeleteChat(deleteConfirmId)}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={cn(
          "relative h-full bg-white transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "w-80" : "w-16",
          className
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Panel de iconos verticales */}
        <div className="absolute left-0 top-0 w-16 h-full border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4 z-10">
          {/* Botón de inicio/nuevo chat */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 mb-4 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all duration-200",
              deleteConfirmId && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleNewChat}
            title={!isExpanded ? "Nuevo chat" : undefined}
            disabled={!!deleteConfirmId}
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Separador visual */}
          <div className="w-8 h-px bg-gray-300 mb-4"></div>

          {/* Otros tabs */}
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 mb-2 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-gray-200 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900",
                  deleteConfirmId && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleTabChange(tab.id)}
                title={!isExpanded ? tab.label : undefined}
                disabled={!!deleteConfirmId}
              >
                <Icon className="h-5 w-5" />
              </Button>
            )
          })}
        </div>

        {/* Área principal del contenido - posición fija para evitar movimiento */}
        <div 
          className={cn(
            "absolute left-16 top-0 h-full w-64 bg-white flex flex-col transition-opacity duration-300 ease-in-out overflow-hidden",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between p-4 border-b border-gray-100 whitespace-nowrap",
            deleteConfirmId && "opacity-60"
          )}>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 text-lg">
                {activeTab === "chats" && "Chats"}
                {activeTab === "projects" && "Proyectos"}
                {activeTab === "files" && "Archivos"}
                {activeTab === "attachments" && "Adjuntos"}
              </h2>
            </div>
            {activeTab === "chats" && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-gray-600" disabled={!!deleteConfirmId}>
                <Search className="h-4 w-4" />
              </Button>
            )}
            {activeTab === "projects" && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-gray-600" disabled={!!deleteConfirmId}>
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Contenido según la pestaña activa */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "chats" && (
              <div className="px-4">
                {/* Botón Nuevo chat */}
                <div className={cn(
                  "py-4 border-b border-gray-100",
                  deleteConfirmId && "opacity-60"
                )}>
                  <Button 
                    onClick={handleNewChat}
                    variant="outline" 
                    className="w-full justify-start gap-3 h-11 text-sm font-medium border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    disabled={!!deleteConfirmId}
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo chat
                  </Button>
                </div>

                {/* Sección Hoy */}
                <div className={cn(
                  "py-4",
                  deleteConfirmId && "opacity-60"
                )}>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                    <Clock className="h-4 w-4" />
                    Hoy
                  </div>
                  
                  <div className="space-y-1">
                    {todayChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => !deleteConfirmId && !renameId && handleChatSelect(chat)}
                        className={cn(
                          "relative flex items-start justify-between p-3 rounded-lg transition-colors group",
                          selectedChatId === chat.id 
                            ? "bg-blue-50 border border-blue-200" 
                            : "hover:bg-gray-50",
                          deleteConfirmId || renameId ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <div className="flex-1 min-w-0 pr-8">
                          {renameId === chat.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmRenameChat()
                                  if (e.key === 'Escape') cancelRename()
                                }}
                                className="w-full text-sm p-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    confirmRenameChat()
                                  }}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelRename()
                                  }}
                                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900 leading-tight mb-1">
                                {chat.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTime(chat.created_at)}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {/* Botón de menú de opciones */}
                        <div className="absolute right-2 top-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                              deleteConfirmId && "opacity-0"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!deleteConfirmId) {
                                handleMenuToggle(chat.id)
                              }
                            }}
                            disabled={!!deleteConfirmId}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {/* Menú desplegable */}
                          {openMenuId === chat.id && !deleteConfirmId && (
                            <div className="absolute right-0 top-8 w-48 bg-white/60 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRenameChat(chat.id, chat.title)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50/70 transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                                Cambiar nombre
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteChat(chat.id)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50/70 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección Recientes */}
                <div className={cn(
                  "py-4 border-t border-gray-100",
                  deleteConfirmId && "opacity-60"
                )}>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                    <MessageCircle className="h-4 w-4" />
                    Recientes
                  </div>
                  
                  <div className="space-y-1">
                    {recentChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => !deleteConfirmId && !renameId && handleChatSelect(chat)}
                        className={cn(
                          "relative flex items-start justify-between p-3 rounded-lg transition-colors group",
                          selectedChatId === chat.id 
                            ? "bg-blue-50 border border-blue-200" 
                            : "hover:bg-gray-50",
                          deleteConfirmId || renameId ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <div className="flex-1 min-w-0 pr-8">
                          {renameId === chat.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmRenameChat()
                                  if (e.key === 'Escape') cancelRename()
                                }}
                                className="w-full text-sm p-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    confirmRenameChat()
                                  }}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelRename()
                                  }}
                                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900 leading-tight mb-1">
                                {chat.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTime(chat.created_at)}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {/* Botón de menú de opciones */}
                        <div className="absolute right-2 top-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                              deleteConfirmId && "opacity-0"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!deleteConfirmId) {
                                handleMenuToggle(chat.id)
                              }
                            }}
                            disabled={!!deleteConfirmId}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {/* Menú desplegable */}
                          {openMenuId === chat.id && !deleteConfirmId && (
                            <div className="absolute right-0 top-8 w-48 bg-white/60 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRenameChat(chat.id, chat.title)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50/70 transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                                Cambiar nombre
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteChat(chat.id)
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50/70 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="px-4">
                {/* Header de proyectos */}
                <div className={cn(
                  "py-4 border-b border-gray-100",
                  deleteConfirmId && "opacity-60"
                )}>
                  <Button 
                    onClick={() => {
                      if (!deleteConfirmId) {
                        // TODO: Implementar lógica para crear nuevo proyecto
                        console.log('Crear nuevo proyecto')
                      }
                    }}
                    variant="outline" 
                    className="w-full justify-start gap-3 h-11 text-sm font-medium border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    disabled={!!deleteConfirmId}
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo proyecto
                  </Button>
                </div>

                {/* Filtros de categorías */}
                <div className={cn(
                  "py-4 border-b border-gray-100",
                  deleteConfirmId && "opacity-60"
                )}>
                  <p className="text-sm font-medium text-gray-600 mb-3">Categorías</p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      disabled={!!deleteConfirmId}
                    >
                      Todos
                    </button>
                    {projectCategories.map((category) => (
                      <button
                        key={category.id}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                          category.color,
                          deleteConfirmId && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!!deleteConfirmId}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de proyectos */}
                <div className={cn(
                  "py-4",
                  deleteConfirmId && "opacity-60"
                )}>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                    <Briefcase className="h-4 w-4" />
                    Proyectos activos
                  </div>
                  
                  <div className="space-y-3">
                    {projects.map((project) => {
                      const category = projectCategories.find(cat => cat.id === project.category)
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'active': return 'bg-green-100 text-green-800'
                          case 'in-progress': return 'bg-yellow-100 text-yellow-800'
                          case 'completed': return 'bg-blue-100 text-blue-800'
                          default: return 'bg-gray-100 text-gray-800'
                        }
                      }
                      
                      const getStatusText = (status: string) => {
                        switch (status) {
                          case 'active': return 'Activo'
                          case 'in-progress': return 'En progreso'
                          case 'completed': return 'Completado'
                          default: return 'Sin estado'
                        }
                      }

                      return (
                        <div
                          key={project.id}
                          onClick={() => {
                            if (!deleteConfirmId) {
                              // TODO: Implementar selección de proyecto
                              console.log('Proyecto seleccionado:', project.id)
                            }
                          }}
                          className={cn(
                            "relative flex flex-col p-4 rounded-lg border transition-all group",
                            "hover:border-blue-200 hover:bg-blue-50/50",
                            deleteConfirmId ? "cursor-not-allowed" : "cursor-pointer"
                          )}
                        >
                          {/* Header del proyecto */}
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900 leading-tight flex-1 pr-2">
                              {project.title}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600",
                                deleteConfirmId && "opacity-0"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!deleteConfirmId) {
                                  // TODO: Implementar menú de opciones para proyectos
                                  console.log('Opciones de proyecto:', project.id)
                                }
                              }}
                              disabled={!!deleteConfirmId}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Metadatos del proyecto */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {category && (
                                <span className={cn(
                                  "px-2 py-1 text-xs font-medium rounded-md",
                                  category.color
                                )}>
                                  {category.name}
                                </span>
                              )}
                              <span className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md",
                                getStatusColor(project.status)
                              )}>
                                {getStatusText(project.status)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {project.date}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className={cn(
                "p-4",
                deleteConfirmId && "opacity-60"
              )}>
                <div className="text-center text-gray-500 py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No hay archivos disponibles</p>
                </div>
              </div>
            )}

            {activeTab === "attachments" && (
              <div className={cn(
                "p-4",
                deleteConfirmId && "opacity-60"
              )}>
                <div className="text-center text-gray-500 py-8">
                  <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No hay adjuntos disponibles</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer con información del usuario */}
          <div className={cn(
            "border-t border-gray-100 p-4",
            deleteConfirmId && "opacity-60"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium shadow-sm flex-shrink-0">
                OR
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Olivia Rhye
                </p>
                <p className="text-xs text-gray-500 truncate">
                  olivia@untitledui.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 