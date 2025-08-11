"use client"

import { Plus, Search, Filter, Briefcase, Clock, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

// Tipos para los datos de proyectos (preparado para API)
interface ProjectCategory {
  id: string
  name: string
  color: string
}

interface Project {
  id: number
  title: string
  category: string
  date: string
  status: 'active' | 'in-progress' | 'completed'
}

export function Projects() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Data de ejemplo para proyectos (preparada para integración con API)
  const projectCategories: ProjectCategory[] = [
    { id: "recursos-humanos", name: "Recursos Humanos", color: "bg-blue-100 text-blue-800 border-blue-200" },
    { id: "soporte-atencion", name: "Soporte y Atención al Cliente", color: "bg-green-100 text-green-800 border-green-200" },
    { id: "ventas-marketing", name: "Ventas y Marketing", color: "bg-purple-100 text-purple-800 border-purple-200" },
    { id: "tecnologia-desarrollo", name: "Tecnología y Desarrollo", color: "bg-orange-100 text-orange-800 border-orange-200" },
  ]

  const projects: Project[] = [
    {
      id: 1,
      title: "Modelos matemáticos para el cambio climático",
      category: "recursos-humanos",
      date: "12 de marzo",
      status: "active"
    },
    {
      id: 2,
      title: "Modelos matemáticos para el cambio climático",
      category: "recursos-humanos", 
      date: "12 de marzo",
      status: "active"
    },
    {
      id: 3,
      title: "Modelos matemáticos para el cambio climático",
      category: "recursos-humanos",
      date: "12 de marzo", 
      status: "active"
    },
    {
      id: 4,
      title: "Modelos matemáticos para el cambio climático",
      category: "recursos-humanos",
      date: "12 de marzo",
      status: "active"
    },
    {
      id: 5,
      title: "Sistema de gestión de recursos",
      category: "tecnologia-desarrollo",
      date: "11 de marzo",
      status: "in-progress"
    },
    {
      id: 6,
      title: "Análisis de satisfacción del cliente",
      category: "soporte-atencion",
      date: "10 de marzo",
      status: "completed"
    }
  ]

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

  // Filtrar proyectos según categoría y búsqueda
  const filteredProjects = projects.filter(project => {
    const matchesCategory = selectedCategory === "all" || project.category === selectedCategory
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Header integrado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proyectos"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Top Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Button>
            
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
              <option value="">Selecciona fuente</option>
              <option value="internal">Proyectos internos</option>
              <option value="external">Proyectos externos</option>
              <option value="archived">Proyectos archivados</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                selectedCategory === "all"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              Todos
            </button>
            {projectCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                  selectedCategory === category.id
                    ? category.color
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Project Card */}
          <div className="group">
            <div className="h-80 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Crear un proyecto</h3>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                <Plus className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Project Cards */}
          {filteredProjects.map((project) => {
            const category = projectCategories.find(cat => cat.id === project.category)
            
            return (
              <div
                key={project.id}
                className="group cursor-pointer"
                onClick={() => {
                  // TODO: Implementar navegación a detalle del proyecto
                  console.log('Navegar a proyecto:', project.id)
                }}
              >
                <div className="h-80 bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implementar menú de opciones
                        console.log('Opciones de proyecto:', project.id)
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2 leading-tight">
                    {project.title}
                  </h3>

                  {/* Category Tag */}
                  {category && (
                    <div className="mb-6">
                      <span className={cn(
                        "inline-block px-3 py-1 text-sm font-medium rounded-md",
                        category.color
                      )}>
                        {category.name}
                      </span>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{project.date}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md",
                      getStatusColor(project.status)
                    )}>
                      {getStatusText(project.status)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron proyectos</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? `No hay proyectos que coincidan con "${searchTerm}"`
                : "No hay proyectos en esta categoría"
              }
            </p>
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Crear primer proyecto
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 