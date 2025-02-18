from typing import Dict, Any, List
from openai import OpenAI
import document_db_manager as doc_db
import streamlit as st
from utils.logger import PrettyLogger as logger
import json

class CAGAgent:
    def __init__(self, api_key: str = None):
        self.current_db: str = None
        self.client = OpenAI(api_key=api_key or st.secrets["OPENAI_API_KEY"])
        logger.system("CAGAgent inicializado")
    
    def set_database(self, db_name: str):
        """Establece la base de datos actual"""
        self.current_db = db_name
        logger.cag_agent('db', f"Base de datos seleccionada: {db_name}")
    
    def get_relevant_context(self, query: str) -> List[Dict[str, Any]]:
        """
        Encuentra y retorna los contextos más relevantes para la consulta
        """
        logger.cag_agent('prompt', f"Buscando contexto para: {query}")
        
        if not self.current_db:
            error_msg = "No se ha seleccionado una base de datos"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Obtener documentos
        documents = doc_db.get_documents(self.current_db)
        logger.cag_agent('db', f"Documentos encontrados: {len(documents)}")
        
        if not documents:
            # Cambiamos la respuesta para cuando no hay documentos
            return [{
                'doc_id': '0',
                'content': "Lo siento, no encontré documentos relevantes para responder tu consulta.",
                'relevance_score': 0,
                'metadata': {'title': 'Sin resultados'}
            }]
        
        # Preparar descripciones
        descriptions = {
            str(doc['id']): {
                'semantic_description': doc['semantic_description'],
                'content': doc['content'],
                'metadata': {'title': doc['title']}
            }
            for doc in documents
        }
        
        # Seleccionar documentos relevantes
        selected_docs = self._select_best_documents(query, descriptions)
        
        # Preparar respuestas
        responses = []
        for doc in selected_docs:
            if doc['doc_id'] in descriptions:
                doc_info = descriptions[doc['doc_id']]
                responses.append({
                    'doc_id': doc['doc_id'],
                    'content': doc_info['content'],
                    'relevance_score': doc['score'],
                    'metadata': doc_info['metadata']
                })
        
        # Solo registrar el resultado final
        logger.json_data('cag', responses)
        return responses
    
    def _select_best_documents(self, query: str, descriptions: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Usa el LLM para seleccionar los mejores documentos evaluando todas las descripciones
        """
        prompt = f"""Actúa como un experto en recuperación de información que debe rankear y seleccionar los documentos más relevantes.

        CONSULTA DEL USUARIO:
        "{query}"

        DOCUMENTOS DISPONIBLES:
        {self._format_descriptions(descriptions)}

        TAREA:
        Selecciona y rankea TODOS los documentos relevantes para la consulta del usuario.
        
        CRITERIOS DE SELECCIÓN Y RANKING:
        1. Relevancia directa con la consulta
        2. Especificidad de la información
        3. Completitud de la respuesta
        4. Prioriza documentos que contengan información complementaria

        INSTRUCCIONES ESPECÍFICAS:
        1. Incluye TODOS los documentos que tengan alguna relevancia con la consulta
        2. Asigna scores de relevancia:
           - 0.9-1.0: Respuesta directa y muy relevante
           - 0.7-0.8: Información relevante
           - 0.5-0.6: Información parcialmente relevante
           - 0.3-0.4: Información tangencialmente relevante
        3. Ordena los documentos por score de mayor a menor
        4. Incluye documentos incluso si tienen baja relevancia

        DEBES RESPONDER EXACTAMENTE EN ESTE FORMATO JSON:
        [
            {{"doc_id": "1", "score": 0.9}},
            {{"doc_id": "2", "score": 0.7}},
            {{"doc_id": "3", "score": 0.4}}
        ]

        NO INCLUYAS NADA MÁS EN TU RESPUESTA, SOLO EL JSON.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system", 
                        "content": "Eres un sistema experto en selección y ranking de documentos. Debes seleccionar TODOS los documentos que tengan alguna relevancia con la consulta, sin límite de cantidad."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            response_text = response.choices[0].message.content.strip()
            
            try:
                # Limpiar y validar la respuesta JSON
                if not response_text.startswith('['):
                    start = response_text.find('[')
                    end = response_text.rfind(']') + 1
                    if start != -1 and end > start:
                        response_text = response_text[start:end]
                    else:
                        logger.error("No se encontró un JSON válido en la respuesta")
                        return self._fallback_selection(query, descriptions)
                
                results = json.loads(response_text)
                
                # Validar la estructura
                if not isinstance(results, list):
                    logger.error("La respuesta no es una lista")
                    return self._fallback_selection(query, descriptions)
                
                if not results:
                    logger.error("La lista está vacía")
                    return self._fallback_selection(query, descriptions)
                
                # Procesar y validar cada resultado
                processed_results = []
                for result in results:
                    if not isinstance(result, dict):
                        continue
                    
                    doc_id = str(result.get('doc_id', ''))
                    score = result.get('score', 0)
                    
                    # Solo incluir documentos con score >= 0.6
                    if doc_id and doc_id in descriptions and score >= 0.6:
                        processed_results.append({
                            'doc_id': doc_id,
                            'score': float(min(max(score, 0), 1))
                        })
                
                # Ordenar por score (ya no limitamos a 3)
                processed_results.sort(key=lambda x: x['score'], reverse=True)
                
                # Si tenemos resultados procesados, los devolvemos
                if processed_results:
                    logger.json_data('cag', processed_results)
                    return processed_results
                
                # Si no hay resultados válidos, usamos el fallback
                logger.error("No se encontraron documentos válidos después del procesamiento")
                return self._fallback_selection(query, descriptions)
                
            except json.JSONDecodeError as e:
                logger.error(f"Error decodificando JSON: {str(e)}")
                return self._fallback_selection(query, descriptions)
            except Exception as e:
                logger.error(f"Error procesando resultados: {str(e)}")
                return self._fallback_selection(query, descriptions)
                
        except Exception as e:
            logger.error(f"Error en la llamada al modelo: {str(e)}")
            return self._fallback_selection(query, descriptions)

    def _fallback_selection(self, query: str, descriptions: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Método de respaldo para selección de documentos cuando falla el modelo principal"""
        best_docs = []
        query_words = query.lower().split()
        
        for doc_id, doc_info in descriptions.items():
            content = doc_info['content'].lower()
            semantic_desc = doc_info['semantic_description'].lower()
            
            # Calcular relevancia basada en contenido y descripción semántica
            content_matches = sum(word in content for word in query_words)
            semantic_matches = sum(word in semantic_desc for word in query_words)
            
            # Peso adicional para coincidencias exactas de frases
            phrase_bonus = 0
            if query.lower() in content:
                phrase_bonus = 0.3
            
            total_relevance = (content_matches * 0.15) + (semantic_matches * 0.1) + phrase_bonus
            score = max(0.3, min(0.5 + total_relevance, 1.0))
            
            # Solo agregar documentos con score >= 0.6
            if score >= 0.6:
                best_docs.append({
                    'doc_id': doc_id,
                    'score': score
                })
        
        # Ordenar por relevancia y devolver todos los que cumplan el criterio
        best_docs.sort(key=lambda x: x['score'], reverse=True)
        return best_docs
    
    def _format_descriptions(self, descriptions: Dict[str, Dict[str, Any]]) -> str:
        """Formatea las descripciones semánticas para el prompt"""
        formatted = ""
        for doc_id, doc_info in descriptions.items():
            formatted += f"""
            DOCUMENTO {doc_id}:
            Título: {doc_info['metadata']['title']}
            
            Descripción Semántica:
            {doc_info['semantic_description']}
            ------------------------
            """
        return formatted 