from typing import Dict, Any
from openai import OpenAI
import streamlit as st
from utils.logger import PrettyLogger as logger
from time import perf_counter
import asyncio
import json
import db_manager as db

class ConversationalAgent:
    def __init__(self, api_key: str = None):
        self.cag_agent = None
        self.client = OpenAI(api_key=api_key or st.secrets["OPENAI_API_KEY"])
        self.conversation_memory = []
        self.personal_memory = {}
        self.current_conversation_id = None
        logger.system("ConversationalAgent inicializado")
    
    def set_cag_agent(self, cag_agent):
        """Establece la referencia al CAG Agent"""
        self.cag_agent = cag_agent
    
    def set_conversation_id(self, conversation_id: int):
        """Establece el ID de conversación actual y carga la memoria"""
        if self.current_conversation_id != conversation_id:
            self.current_conversation_id = conversation_id
            self.load_memories()
    
    def load_memories(self):
        """Carga las memorias desde la base de datos"""
        try:
            # Cargar memoria personal
            personal_memory = db.get_memory(self.current_conversation_id, 'personal')
            self.personal_memory = json.loads(personal_memory) if personal_memory else {}
            
            # Cargar memoria de conversación
            conversation_memory = db.get_memory(self.current_conversation_id, 'conversation')
            self.conversation_memory = json.loads(conversation_memory) if conversation_memory else []
            
        except Exception as e:
            logger.error(f"Error cargando memorias: {str(e)}")
            self.personal_memory = {}
            self.conversation_memory = []
    
    def save_memories(self):
        """Guarda las memorias en la base de datos"""
        try:
            if self.current_conversation_id:
                # Guardar memoria personal
                db.save_memory(
                    self.current_conversation_id,
                    'personal',
                    json.dumps(self.personal_memory)
                )
                
                # Guardar memoria de conversación
                db.save_memory(
                    self.current_conversation_id,
                    'conversation',
                    json.dumps(self.conversation_memory)
                )
        except Exception as e:
            logger.error(f"Error guardando memorias: {str(e)}")
    
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
        """Obtiene el contexto detallado de las últimas interacciones"""
        if not self.conversation_memory:
            return ""
        
        # Obtener los últimos mensajes de la base de datos
        messages = db.get_messages(self.current_conversation_id)
        recent_messages = messages[-6:]  # Obtener las últimas 3 preguntas y 3 respuestas
        
        context = "Últimas interacciones:\n"
        for msg in recent_messages:
            role = "Usuario" if msg["role"] == "user" else "Asistente"
            content = msg["content"]
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except json.JSONDecodeError:
                    pass
            
            if isinstance(content, dict):
                content = content.get("response", "")
            
            context += f"{role}: {content}\n"
        
        return context

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
            
            # Guardar en la base de datos
            self.save_memories()
            
            return {
                'response': full_response,
                'metrics': {
                    'total': f"{(perf_counter() - start_total):.1f}s",
                    'tipo': 'Respuesta Personal'
                }
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
            
            # Guardar en la base de datos
            self.save_memories()
            
        except Exception as e:
            logger.error(f"Error actualizando memoria personal: {str(e)}")

    def process_user_query(self, query: str) -> Dict[str, Any]:
        # Verificar si es una consulta personal
        if not self.is_document_query(query):
            return self.process_personal_query(query)
        
        # Si no es personal, procesar como consulta documental
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
            metrics['tipo'] = 'Respuesta Documental'
            return {
                'response': "Lo siento, no encontré información relevante en los documentos disponibles para responder tu consulta. ¿Podrías reformular tu pregunta o intentar con otra consulta?",
                'references': [],
                'metrics': metrics
            }
        
        # Preparar el contexto combinado con referencias
        start_prep = perf_counter()
        combined_context = ""
        references_map = {}
        for i, ctx in enumerate(contexts, 1):
            title = ctx['metadata'].get('title', 'Sin título')
            references_map[str(i)] = title
            combined_context += f"\nDocumento {i}:\n"
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
        3. Usa solo [n] para referenciar documentos, sin la palabra "documento"
        4. Si la información no está en los documentos, indícalo claramente
        5. Cita el documento relevante cada vez que menciones información específica
        6. Solo usa las referencias que sean relevantes para la respuesta
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
            
            # Después de obtener full_response, analizar qué referencias fueron usadas
            used_references = []
            for ref_num in references_map.keys():
                if f"[{ref_num}]" in full_response:
                    used_references.append(f"[{ref_num}] {references_map[ref_num]}")
            
            # Generar y guardar el resumen de la interacción
            interaction_summary = self.generate_interaction_summary(query, full_response)
            if interaction_summary:
                self.conversation_memory.append(interaction_summary)
                # Mantener solo las últimas 5 interacciones
                if len(self.conversation_memory) > 5:
                    self.conversation_memory.pop(0)
            
            # Guardar en la base de datos
            self.save_memories()
            
            metrics['generación'] = f"{(perf_counter() - start_llm):.1f}s"
            metrics['total'] = f"{(perf_counter() - start_total):.1f}s"
            metrics['tipo'] = 'Respuesta Documental'
            
            return {
                'response': full_response,
                'references': used_references,
                'metrics': metrics
            }
            
        except Exception as e:
            metrics['total'] = f"{(perf_counter() - start_total):.1f}s"
            return {
                'response': f"Lo siento, ocurrió un error al procesar tu consulta: {str(e)}",
                'references': [],
                'metrics': metrics
            }
