from typing import Dict, Any
from openai import OpenAI
import streamlit as st
from utils.logger import PrettyLogger as logger
from time import perf_counter
import asyncio
import json

class ConversationalAgent:
    def __init__(self, api_key: str = None):
        self.cag_agent = None
        self.client = OpenAI(api_key=api_key or st.secrets["OPENAI_API_KEY"])
        self.conversation_memory = []
        self.personal_memory = {}  # Para guardar información personal del usuario
        logger.system("ConversationalAgent inicializado")
    
    def set_cag_agent(self, cag_agent):
        """Establece la referencia al CAG Agent"""
        self.cag_agent = cag_agent
    
    def generate_interaction_summary(self, query: str, response: str) -> str:
        """Genera un resumen conciso de la interacción"""
        try:
            prompt = f"""Resume brevemente la siguiente interacción entre usuario y asistente en una sola oración.
            Enfócate en la intención del usuario y los documentos o temas principales mencionados en la respuesta.

            Usuario: {query}
            Asistente: {response}
            """
            
            completion = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Resume interacciones de manera concisa"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=100
            )
            
            return completion.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generando resumen: {str(e)}")
            return ""

    def get_conversation_context(self) -> str:
        """Obtiene el contexto de las últimas interacciones"""
        if not self.conversation_memory:
            return ""
            
        return "\n".join([
            f"Interacción previa: {memory}" 
            for memory in self.conversation_memory[-3:]  # Mantener solo las últimas 3 interacciones
        ])

    def is_document_query(self, query: str) -> bool:
        """Determina si la consulta requiere búsqueda en documentos"""
        try:
            prompt = f"""Determina si esta consulta requiere buscar información en documentos o es una consulta general/personal.
            Responde solo con 'SI' o 'NO'.
            
            Consulta: {query}
            
            Ejemplos:
            - "Me llamo Juan" -> NO
            - "¿Cuál es la política de devoluciones?" -> SI
            - "¿Puedes recordar que me gustan los perros?" -> NO
            - "¿Qué dice el manual sobre mantenimiento?" -> SI
            """
            
            completion = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Determina si una consulta requiere búsqueda documental"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=10
            )
            
            return completion.choices[0].message.content.strip().upper() == "SI"
            
        except Exception as e:
            logger.error(f"Error determinando tipo de consulta: {str(e)}")
            return True  # Por defecto, asumimos que necesita documentos
    
    def process_personal_query(self, query: str) -> Dict[str, Any]:
        """Procesa consultas generales o personales sin búsqueda documental"""
        start_total = perf_counter()
        
        try:
            conversation_context = self.get_conversation_context()
            personal_context = "\n".join([f"{k}: {v}" for k, v in self.personal_memory.items()])
            
            prompt = f"""Responde a la consulta del usuario de manera conversacional.
            
            MEMORIA PERSONAL:
            {personal_context}
            
            CONTEXTO DE CONVERSACIÓN PREVIA:
            {conversation_context}
            
            CONSULTA DEL USUARIO:
            {query}
            
            INSTRUCCIONES:
            1. Si el usuario comparte información personal, guárdala y confírmalo
            2. Usa la información de la memoria personal si es relevante
            3. Mantén un tono amigable y conversacional
            4. Si mencionas información de la memoria, indícalo con [Memoria Personal]
            """
            
            # Iniciar respuesta en streaming
            placeholder = st.empty()
            full_response = ""
            
            stream = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Eres un asistente amigable que recuerda información personal"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    full_response += chunk.choices[0].delta.content
                    placeholder.markdown(full_response + "▌")
            
            placeholder.empty()
            
            # Actualizar memoria personal si hay nueva información
            self.update_personal_memory(query, full_response)
            
            # Generar resumen de la interacción
            interaction_summary = self.generate_interaction_summary(query, full_response)
            if interaction_summary:
                self.conversation_memory.append(interaction_summary)
                if len(self.conversation_memory) > 5:
                    self.conversation_memory.pop(0)
            
            return {
                'response': full_response,
                'metrics': {'total': f"{(perf_counter() - start_total):.1f}s"}
            }
            
        except Exception as e:
            return {
                'response': f"Lo siento, ocurrió un error: {str(e)}",
                'metrics': {'total': f"{(perf_counter() - start_total):.1f}s"}
            }
    
    def update_personal_memory(self, query: str, response: str) -> None:
        """Actualiza la memoria personal basada en la interacción"""
        try:
            prompt = f"""Extrae información personal clave de esta interacción en formato JSON.
            Si no hay información personal nueva, responde con {{}}.
            
            Usuario: {query}
            Asistente: {response}
            
            Ejemplo de formato:
            {{
                "nombre": "Juan",
                "mascota": "perro llamado Max"
            }}
            """
            
            completion = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Extrae información personal en formato JSON"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=200
            )
            
            new_info = json.loads(completion.choices[0].message.content)
            self.personal_memory.update(new_info)
            
        except Exception as e:
            logger.error(f"Error actualizando memoria personal: {str(e)}")

    def process_user_query(self, query: str) -> Dict[str, Any]:
        # Determinar si la consulta requiere búsqueda documental
        if not self.is_document_query(query):
            return self.process_personal_query(query)
        
        # El resto del código existente para búsqueda documental...
        metrics = {}
        start_total = perf_counter()
        
        # Agregar contexto de la conversación y memoria personal
        conversation_context = self.get_conversation_context()
        personal_context = "\n".join([f"{k}: {v}" for k, v in self.personal_memory.items()])
        enhanced_query = f"""
        Contexto personal: {personal_context}
        
        Contexto de conversación: {conversation_context}
        
        Consulta actual: {query}
        """
        
        # Obtener contextos relevantes
        start_context = perf_counter()
        contexts = self.cag_agent.get_relevant_context(enhanced_query)
        metrics['búsqueda'] = f"{(perf_counter() - start_context):.1f}s"
        
        # Verificar si no hay resultados
        if len(contexts) == 1 and contexts[0]['doc_id'] == '0':
            metrics['total'] = f"{(perf_counter() - start_total):.1f}s"
            return {
                'response': "Lo siento, no encontré información relevante en los documentos disponibles para responder tu consulta. ¿Podrías reformular tu pregunta o intentar con otra consulta?",
                'references': [],
                'metrics': metrics
            }
        
        # Preparar el contexto combinado con referencias
        start_prep = perf_counter()
        combined_context = ""
        references = []
        for i, ctx in enumerate(contexts, 1):
            title = ctx['metadata'].get('title', 'Sin título')
            references.append(f"[{i}] {title}")
            combined_context += f"\nDocumento [{i}] - {title}:\n"
            combined_context += f"{ctx['content']}\n"
        metrics['preparación'] = f"{(perf_counter() - start_prep):.1f}s"
        
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
            # Iniciar respuesta en streaming
            start_llm = perf_counter()
            placeholder = st.empty()
            full_response = ""
            
            # Modificar el prompt para incluir el contexto de la conversación
            system_prompt = """Eres un asistente experto que proporciona respuestas detalladas y precisas basadas en documentos, 
            siempre citando las fuentes con [n]. Si el usuario hace referencia a una conversación previa, 
            usa ese contexto para entender mejor la consulta."""
            
            conversation_context = self.get_conversation_context()
            if conversation_context:
                prompt = f"""Contexto de la conversación previa:
                {conversation_context}
                
                {prompt}"""
            
            stream = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                stream=True
            )
            
            # Procesar el streaming
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    full_response += chunk.choices[0].delta.content
                    placeholder.markdown(full_response + "▌")
            
            # Limpiar el placeholder al finalizar
            placeholder.empty()
            
            # Generar y guardar el resumen de la interacción
            interaction_summary = self.generate_interaction_summary(query, full_response)
            if interaction_summary:
                self.conversation_memory.append(interaction_summary)
                # Mantener solo las últimas 5 interacciones
                if len(self.conversation_memory) > 5:
                    self.conversation_memory.pop(0)
            
            metrics['generación'] = f"{(perf_counter() - start_llm):.1f}s"
            metrics['total'] = f"{(perf_counter() - start_total):.1f}s"
            
            return {
                'response': full_response,
                'references': references,
                'metrics': metrics
            }
            
        except Exception as e:
            metrics['total'] = f"{(perf_counter() - start_total):.1f}s"
            return {
                'response': f"Lo siento, ocurrió un error al procesar tu consulta: {str(e)}",
                'references': [],
                'metrics': metrics
            }
