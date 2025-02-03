from typing import Dict, Any
from openai import OpenAI
import streamlit as st
from utils.logger import PrettyLogger as logger

class ConversationalAgent:
    def __init__(self, api_key: str = None):
        self.cag_agent = None
        self.client = OpenAI(api_key=api_key or st.secrets["OPENAI_API_KEY"])
        logger.system("ConversationalAgent inicializado")
    
    def set_cag_agent(self, cag_agent):
        """Establece la referencia al CAG Agent"""
        self.cag_agent = cag_agent
    
    def process_user_query(self, query: str) -> Dict[str, Any]:
        # Obtener contextos relevantes
        contexts = self.cag_agent.get_relevant_context(query)
        
        # Verificar si no hay resultados
        if len(contexts) == 1 and contexts[0]['doc_id'] == '0':
            return {
                'response': "Lo siento, no encontré información relevante en los documentos disponibles para responder tu consulta. ¿Podrías reformular tu pregunta o intentar con otra consulta?",
                'references': []
            }
            
        # Preparar el contexto combinado con referencias
        combined_context = ""
        references = []
        for i, ctx in enumerate(contexts, 1):
            title = ctx['metadata'].get('title', 'Sin título')
            references.append(f"[{i}] {title}")
            combined_context += f"\nDocumento [{i}] - {title}:\n"
            combined_context += f"{ctx['content']}\n"
        
        prompt = f"""Basándote en los siguientes documentos, responde a la consulta del usuario.
        
        DOCUMENTOS DE REFERENCIA:
        {combined_context}
        
        CONSULTA DEL USUARIO:
        {query}
        
        INSTRUCCIONES:
        1. Analiza cuidadosamente los documentos proporcionados
        2. Responde la consulta del usuario de manera clara y detallada
        3. Incluye referencias a los documentos usando el formato [1], [2], etc.
        4. Si la información no está en los documentos, indícalo claramente
        5. Cita el documento relevante cada vez que menciones información específica
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente experto que proporciona respuestas detalladas y precisas basadas en documentos, siempre citando las fuentes con [n]."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            
            return {
                'response': response.choices[0].message.content,
                'references': references
            }
            
        except Exception as e:
            return {
                'response': f"Lo siento, ocurrió un error al procesar tu consulta: {str(e)}",
                'references': []
            }
