import OpenAI from 'openai'
import { getDatabase, AgentResult } from './database'
import { getDocumentManager } from './document-manager'

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Interfaz para la configuración del agente
interface AgentConfig {
  model?: string
  temperature?: number
  maxTokens?: number
}

// Interfaz para la base de conocimiento
interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: string[]
}

// Bases de conocimiento simuladas (en una implementación real, esto vendría de una base de datos vectorial)
const KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'rh',
    name: 'Recursos Humanos',
    description: 'Políticas de personal, beneficios, evaluaciones y procedimientos de RRHH',
    documents: [
      'Manual de empleados - Políticas de vacaciones y permisos',
      'Guía de beneficios médicos y seguros',
      'Proceso de evaluación de desempeño',
      'Políticas de trabajo remoto e híbrido'
    ]
  },
  {
    id: 'ops',
    name: 'Operaciones y Procesos',
    description: 'Procedimientos operativos, calidad y optimización de procesos',
    documents: [
      'Manual de procesos operativos estándar',
      'Procedimientos de control de calidad',
      'Guía de optimización de flujos de trabajo'
    ]
  },
  {
    id: 'finance',
    name: 'Finanzas y Contabilidad',
    description: 'Reportes financieros, presupuestos y políticas contables',
    documents: [
      'Reportes financieros trimestrales',
      'Políticas de gastos y presupuestos',
      'Análisis de ventas y rentabilidad'
    ]
  },
  {
    id: 'tech',
    name: 'Tecnología y Desarrollo',
    description: 'Documentación técnica, arquitectura y desarrollo de software',
    documents: [
      'Documentación de API y servicios',
      'Guía de desarrollo y mejores prácticas',
      'Arquitectura de sistemas y infraestructura'
    ]
  }
]

class ConversationalAgent {
  private conversationId: string | null = null
  private cagAgent: CAGAgent | null = null
  private config: AgentConfig

  constructor(config: AgentConfig = {}) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      ...config
    }
    console.log('🤖 ConversationalAgent inicializado')
  }

  setConversationId(id: string): void {
    this.conversationId = id
  }

  setCagAgent(agent: CAGAgent): void {
    this.cagAgent = agent
  }

  async processUserQuery(userMessage: string): Promise<AgentResult> {
    if (!this.cagAgent) {
      throw new Error('CAG Agent not configured')
    }

    try {
      const startTime = Date.now()
      console.log('🤖 ConversationalAgent procesando consulta:', userMessage)
      
      // Delegar al agente CAG para el procesamiento
      const result = await this.cagAgent.processQuery(userMessage)
      
      const endTime = Date.now()
      const processingTime = endTime - startTime

      console.log('✅ ConversationalAgent procesamiento completado')

      // Agregar métricas de tiempo y información del agente
      const finalResult: AgentResult = {
        ...result,
        metrics: {
          ...result.metrics,
          'agente primario': 'ConversationalAgent',
          'agente secundario': 'CAGAgent',
          'tiempo de procesamiento': `${processingTime}ms`,
          'modelo': this.config.model,
          'temperatura': this.config.temperature
        }
      }

      return finalResult
    } catch (error) {
      console.error('❌ Error in ConversationalAgent:', error)
      return {
        response: 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, inténtalo de nuevo.',
        metrics: {
          error: true,
          'agente': 'ConversationalAgent',
          'tiempo de procesamiento': '0ms'
        }
      }
    }
  }
}

class CAGAgent {
  private database: string | null = null
  private config: AgentConfig

  constructor(config: AgentConfig = {}) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1500,
      ...config
    }
    console.log('🔧 CAGAgent inicializado')
  }

  setDatabase(databaseName: string): void {
    this.database = databaseName
    console.log('🔧 CAGAgent base de datos seleccionada:', databaseName)
  }

  async processQuery(userMessage: string): Promise<AgentResult> {
    try {
      const startTime = Date.now()
      console.log('🔧 CAGAgent procesando consulta:', userMessage)

      if (!this.database) {
        console.log('⚠️ CAGAgent: No hay base de datos seleccionada')
        return {
          response: 'Por favor, selecciona una base de conocimiento específica para obtener respuestas más precisas.',
          metrics: {
            'agente': 'CAGAgent',
            'base de datos': 'no seleccionada',
            'referencias': 0,
            'estado': 'sin contexto'
          }
        }
      }

      // Obtener información de la base de datos real
      const documentManager = getDocumentManager()
      const realDatabases = await documentManager.getDocumentDatabases()
      const knowledgeBase = realDatabases.find(kb => kb.id === this.database)
      
      if (!knowledgeBase) {
        console.log('⚠️ CAGAgent: Base de datos no encontrada:', this.database)
        return {
          response: 'La base de conocimiento seleccionada no está disponible.',
          metrics: {
            'agente': 'CAGAgent',
            'base de datos': this.database,
            'referencias': 0,
            'estado': 'error - base no encontrada'
          }
        }
      }

      console.log('📚 CAGAgent usando base de datos:', knowledgeBase.name)

      // Obtener documentos reales de la base de datos
      const allDocuments = await documentManager.getDocuments(this.database)
      const relevantDocs = this.searchRelevantDocuments(userMessage, allDocuments)
      console.log('📄 CAGAgent documentos encontrados:', relevantDocs.length)

      // Crear contexto para OpenAI
      const context = this.buildContextFromRealDocs(knowledgeBase, relevantDocs, userMessage)
      
      console.log('🤖 CAGAgent llamando a OpenAI con modelo:', this.config.model)
      
      // Llamar a OpenAI
      const completion = await openai.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente especializado en ${knowledgeBase.description}. 
            Responde basándote únicamente en la información proporcionada en el contexto.
            Si la información no está disponible en el contexto, indica que no tienes esa información específica.
            Sé preciso, útil y profesional en tus respuestas.`
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      })

      const response = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.'
      const endTime = Date.now()

      console.log('✅ CAGAgent respuesta generada exitosamente')

      return {
        response,
        references: relevantDocs.map(doc => doc.title),
        metrics: {
          'agente': 'CAGAgent',
          'base de datos': knowledgeBase.name,
          'referencias': relevantDocs.length,
          'tokens utilizados': completion.usage?.total_tokens || 0,
          'tiempo de IA': `${endTime - startTime}ms`,
          'modelo utilizado': this.config.model,
          'temperatura': this.config.temperature,
          'tipo': 'respuesta con contexto',
          'estado': 'éxito'
        }
      }

    } catch (error) {
      console.error('❌ Error in CAGAgent:', error)
      return {
        response: 'Ha ocurrido un error al procesar tu consulta. Por favor, verifica que has seleccionado una base de conocimiento válida.',
        metrics: {
          error: true,
          'agente': 'CAGAgent',
          'base de datos': this.database || 'no configurada',
          'estado': 'error'
        }
      }
    }
  }

  private searchRelevantDocuments(query: string, documents: any[]): any[] {
    // Búsqueda semántica simple en documentos reales
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(' ').filter(word => word.length > 2)
    
    return documents.filter(doc => {
      const titleLower = doc.title.toLowerCase()
      const contentLower = doc.content.toLowerCase()
      const descriptionLower = doc.semantic_description.toLowerCase()
      
      // Buscar en título, contenido y descripción semántica
      return keywords.some(keyword => 
        titleLower.includes(keyword) || 
        contentLower.includes(keyword) || 
        descriptionLower.includes(keyword)
      )
    }).slice(0, 3) // Limitar a 3 documentos más relevantes
  }

  private buildContextFromRealDocs(knowledgeBase: any, relevantDocs: any[], userQuery: string): string {
    const context = `
CONTEXTO DE ${knowledgeBase.name.toUpperCase()}:
${knowledgeBase.description}

DOCUMENTOS RELEVANTES:
${relevantDocs.map((doc, index) => `
${index + 1}. DOCUMENTO: ${doc.title}
   DESCRIPCIÓN: ${doc.semantic_description}
   CONTENIDO: ${doc.content.substring(0, 1500)}...
`).join('\n')}

CONSULTA DEL USUARIO: ${userQuery}

Por favor, responde basándote únicamente en la información de los documentos proporcionados.`

    return context.trim()
  }

  private buildContext(knowledgeBase: KnowledgeBase, relevantDocs: string[], userQuery: string): string {
    const context = `
CONTEXTO DE ${knowledgeBase.name.toUpperCase()}:
${knowledgeBase.description}

DOCUMENTOS RELEVANTES:
${relevantDocs.map((doc, index) => `${index + 1}. ${doc}`).join('\n')}

CONSULTA DEL USUARIO:
${userQuery}

Responde basándote en la información de los documentos relevantes proporcionados.
    `
    
    return context.trim()
  }
}

// Función para obtener las bases de conocimiento disponibles
export function getDocumentDatabases(): KnowledgeBase[] {
  return KNOWLEDGE_BASES
}

// Función para obtener una base de conocimiento específica
export function getDocumentDatabase(id: string): KnowledgeBase | undefined {
  return KNOWLEDGE_BASES.find(kb => kb.id === id)
}

export { ConversationalAgent, CAGAgent }
export type { AgentConfig, KnowledgeBase }
