"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { Search, Upload, Download, Trash2, FileText, Eye, Copy, Calendar, Database, HardDrive } from "lucide-react"
import { useChat } from "@/lib/hooks/useChat"
import ReactMarkdown from 'react-markdown'

// Componente para renderizar markdown con estilos consistentes
const MarkdownRenderer = ({ content }: { content: string }) => (
  <ReactMarkdown
    components={{
      h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2 text-gray-800" {...props} />,
      h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2 text-gray-800" {...props} />,
      h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-1 text-gray-800" {...props} />,
      h4: ({node, ...props}) => <h4 className="text-sm font-semibold mt-2 mb-1 text-gray-700" {...props} />,
      p: ({node, ...props}) => <p className="mb-2" {...props} />,
      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 ml-4" {...props} />,
      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 ml-4" {...props} />,
      li: ({node, ...props}) => <li className="mb-1" {...props} />,
      strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
      em: ({node, ...props}) => <em className="italic" {...props} />,
      code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600" {...props} />,
    }}
  >
    {content}
  </ReactMarkdown>
)

interface Document {
  id: string
  title: string
  filename: string
  database_name: string
  content: string
  semantic_description: string
  created_at: string
  file_size: number
  file_type: string
}

interface DocumentsResponse {
  documents: Document[]
  total: number
  database: string
}

export function Documents() {
  const { knowledgeBases } = useChat()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDatabase, setSelectedDatabase] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set())
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDatabase, setUploadDatabase] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Cargar documentos
  const loadDocuments = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('db', selectedDatabase)
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/documents?${params}`)
      if (!response.ok) throw new Error('Error al cargar documentos')
      
      const data: DocumentsResponse = await response.json()
      setDocuments(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  // Efecto para cargar documentos cuando cambian los filtros
  useEffect(() => {
    loadDocuments()
  }, [selectedDatabase, searchTerm])

  // Subir archivo
  const handleUpload = async () => {
    if (!uploadFile || !uploadDatabase) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('database', uploadDatabase)
      formData.append('title', uploadTitle || uploadFile.name)

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Error al subir archivo')

      // Limpiar formulario y recargar documentos
      setUploadFile(null)
      setUploadTitle('')
      setUploadDatabase('')
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setIsUploading(false)
    }
  }

  // Eliminar documento
  const handleDelete = async (documentId: string, documentDbName: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}?db=${documentDbName}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar documento')
      
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar documento')
    }
  }

  // Toggle expandir documento
  const toggleExpanded = (documentId: string) => {
    const newExpanded = new Set(expandedDocuments)
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId)
    } else {
      newExpanded.add(documentId)
    }
    setExpandedDocuments(newExpanded)
  }

  // Copiar al portapapeles
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // TODO: Mostrar toast de éxito
      console.log(`${type} copiado al portapapeles`)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Gestión de Documentos</h1>
          <p className="text-gray-600">Administra y explora tus documentos por base de conocimiento</p>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Selector de base de datos */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base de Conocimiento
              </label>
              <select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las bases de datos</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>

            {/* Búsqueda */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Documentos
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en títulos, contenido y descripciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección de subida de archivos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📤 Subir Nuevo Documento</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivo
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del Documento
              </label>
              <Input
                placeholder="Título personalizado (opcional)"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base de Conocimiento
              </label>
              <select
                value={uploadDatabase}
                onChange={(e) => setUploadDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar base de datos</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!uploadFile || !uploadDatabase || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Resultados */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Documentos Encontrados
              </h2>
              <span className="text-sm text-gray-500">
                {isLoading ? 'Cargando...' : `${documents.length} documentos`}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6">
                {/* Header del documento */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{doc.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Database className="h-4 w-4" />
                        {knowledgeBases.find(kb => kb.id === doc.database_name)?.name || doc.database_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(doc.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        {formatFileSize(doc.file_size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(doc.id)}
                    >
                      <Eye className="h-4 w-4" />
                      {expandedDocuments.has(doc.id) ? 'Ocultar' : 'Ver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.database_name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Descripción semántica */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">📝 Descripción Semántica</h4>
                  <div className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none">
                    <MarkdownRenderer content={doc.semantic_description} />
                  </div>
                </div>

                {/* Contenido expandido */}
                {expandedDocuments.has(doc.id) && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">📃 Contenido del Documento</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(doc.content, 'Contenido')}
                        >
                          <Copy className="h-4 w-4" />
                          Copiar Contenido
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(doc.semantic_description, 'Descripción')}
                        >
                          <Copy className="h-4 w-4" />
                          Copiar Descripción
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const downloadUrl = `/api/documents/${doc.id}/download?db=${doc.database_name}&filename=${doc.filename}`
                            window.open(downloadUrl, '_blank')
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                        <MarkdownRenderer content={doc.content} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {documents.length === 0 && !isLoading && (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'No se encontraron documentos que coincidan con tu búsqueda'
                    : 'No hay documentos en esta base de conocimiento'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
