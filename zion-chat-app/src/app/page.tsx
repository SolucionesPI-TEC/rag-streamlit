"use client"

import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"
import { Projects } from "@/components/projects"
import { Documents } from "@/components/documents"
import { useState } from "react"
import { FileText, Paperclip } from "lucide-react"
import { useChat, type Conversation } from "@/lib/hooks/useChat"

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("chats")
  const {
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    clearCurrentConversation,
    deleteConversation,
    updateConversationTitle,
    isLoading,
    error
  } = useChat()

  const handleNewChat = async () => {
    // Resetear al chat principal y asegurar que estamos en la pestaña de chats
    clearCurrentConversation()
    setActiveTab("chats")
    
    try {
      await createConversation()
    } catch (error) {
      console.error("Error creating new chat:", error)
    }
  }

  const handleChatSelect = (chat: Conversation) => {
    selectConversation(chat)
  }

  const handleBackToEmpty = () => {
    clearCurrentConversation()
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Si cambiamos a otra pestaña que no sea chats, resetear el chat seleccionado
    if (tab !== "chats") {
      clearCurrentConversation()
    }
  }

  const handleDeleteChat = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId)
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleRenameChat = async (conversationId: string, newTitle: string) => {
    try {
      await updateConversationTitle(conversationId, newTitle)
    } catch (error) {
      console.error("Error renaming conversation:", error)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar 
        conversations={conversations}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        selectedChatId={currentConversation?.id || null}
        onTabChange={handleTabChange}
        activeTab={activeTab}
        isLoading={isLoading}
      />
      
      {/* Área principal - contenido dinámico según la pestaña */}
      {activeTab === "chats" && (
        <ChatArea 
          selectedChat={currentConversation}
          onBackToEmpty={handleBackToEmpty}
        />
      )}
      
      {activeTab === "projects" && (
        <Projects />
      )}

      {activeTab === "files" && (
        <Documents />
      )}

      {activeTab === "attachments" && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Paperclip className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Adjuntos</h3>
            <p className="text-gray-500">Funcionalidad en desarrollo</p>
          </div>
        </div>
      )}
    </div>
  )
}
