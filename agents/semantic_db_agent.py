from openai import OpenAI
import streamlit as st

class SemanticDBAgent:
    def __init__(self):
        self.client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])
    
    def generate_description(self, text):
        prompt = """
        Analiza el siguiente texto y genera una descripción semántica detallada que incluya:
        1. Tema principal del documento
        2. Conceptos clave
        3. Palabras clave relevantes
        4. Resumen estructurado del contenido
        
        Texto a analizar:
        {text}
        
        Genera una descripción que ayude a futuros agentes a entender el contenido y contexto del documento.
        """.format(text=text) 
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Eres un agente especializado en análisis y catalogación de documentos. Tu tarea es generar descripciones semánticas detalladas y estructuradas."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            st.error(f"Error al generar la descripción semántica: {str(e)}")
            return "Error al generar la descripción semántica" 