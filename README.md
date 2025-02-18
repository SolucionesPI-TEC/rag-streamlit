# CAGv2 - Asistente Conversacional con Gestión de Documentos

## Descripción
CAGv2 es un sistema avanzado de asistente conversacional que integra capacidades de gestión de documentos y procesamiento de lenguaje natural. El sistema está diseñado para interactuar con usuarios, procesar documentos y mantener conversaciones contextuales.

## Características Principales
- Interfaz web interactiva construida con Streamlit
- Procesamiento de múltiples formatos de documentos (PDF, DOCX)
- Integración con OpenAI para procesamiento de lenguaje natural
- Sistema de gestión de base de datos para documentos
- Capacidades conversacionales avanzadas

## Requisitos del Sistema
- Python 3.x
- Dependencias listadas en `requirements.txt`

## Instalación
1. Clonar el repositorio:
```bash
git clone https://github.com/[usuario]/CAGv2.git
cd CAGv2
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
   - Crear archivo `.streamlit/secrets.toml` con las credenciales necesarias
   - Configurar API key de OpenAI

## Estructura del Proyecto
```
CAGv2/
├── agents/                 # Agentes conversacionales y de procesamiento
├── databases/             # Bases de datos y gestión de documentos
├── pages/                 # Páginas de la interfaz de Streamlit
├── utils/                 # Utilidades y herramientas auxiliares
├── Chat.py               # Aplicación principal
└── requirements.txt      # Dependencias del proyecto
```

## Uso
Para iniciar la aplicación:
```bash
streamlit run Chat.py
```

## Características de los Agentes
- `semantic_db_agent.py`: Gestión de búsqueda semántica
- `conversational_agent.py`: Manejo de conversaciones
- `cag_agent.py`: Agente principal de coordinación

## Contribución
Las contribuciones son bienvenidas. Por favor, asegúrate de:
1. Hacer fork del repositorio
2. Crear una rama para tu característica
3. Enviar un pull request con tus cambios

## Licencia
[Especificar tipo de licencia]

## Contacto
[Información de contacto del mantenedor]