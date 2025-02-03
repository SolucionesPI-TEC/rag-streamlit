import streamlit as st
import db_manager as db
from datetime import datetime
from agents.conversational_agent import ConversationalAgent
from agents.cag_agent import CAGAgent
import document_db_manager as doc_db
import json

def init_chat_state():
    if "current_conversation_id" not in st.session_state:
        st.session_state.current_conversation_id = db.create_conversation()
    if "current_document_db" not in st.session_state:
        st.session_state.current_document_db = None
    if "agents" not in st.session_state:
        conv_agent = ConversationalAgent()
        cag_agent = CAGAgent()
        conv_agent.set_cag_agent(cag_agent)
        st.session_state.agents = {
            "conversational": conv_agent,
            "cag": cag_agent
        }
    
    # Asegurarse de que el agente tenga el ID de conversación correcto
    st.session_state.agents["conversational"].set_conversation_id(
        st.session_state.current_conversation_id
    )

def format_time(timestamp):
    dt = datetime.strptime(timestamp[:16], '%Y-%m-%d %H:%M')
    return dt.strftime('%d %b, %H:%M')

def main():
    st.set_page_config(
        page_title="Chat Assistant",
        page_icon="🤖",
        initial_sidebar_state="expanded"
    )
    
    # Inicializar
    db.init_db()
    init_chat_state()
    
    # Sidebar
    with st.sidebar:
        st.title("💬 Chats")
        
        # Selector de base de datos
        st.subheader("📚 Base de Datos")
        databases = doc_db.get_document_databases()
        db_options = ["Seleccionar base de datos..."] + [db['name'] for db in databases]
        selected_db = st.selectbox(
            "Base de datos de documentos:",
            db_options,
            index=0
        )
        
        if selected_db != "Seleccionar base de datos...":
            if selected_db != st.session_state.current_document_db:
                st.session_state.current_document_db = selected_db
                st.session_state.agents["cag"].set_database(selected_db)
                st.rerun()
        
        st.divider()
        
        # Botón de nueva conversación
        if st.button("➕ Nueva conversación", use_container_width=True):
            st.session_state.current_conversation_id = db.create_conversation()
            st.session_state.agents["conversational"].set_conversation_id(
                st.session_state.current_conversation_id
            )
            st.rerun()
        
        st.divider()
        
        # Lista de conversaciones
        conversations = db.get_conversations()
        for conv_id, title, created_at in conversations:
            col1, col2 = st.columns([4,1])
            
            with col1:
                if st.button(
                    f"{'📍' if conv_id == st.session_state.current_conversation_id else '💭'} {title}\n{format_time(created_at)}", 
                    key=f"chat_{conv_id}",
                    use_container_width=True
                ):
                    st.session_state.current_conversation_id = conv_id
                    st.session_state.agents["conversational"].set_conversation_id(conv_id)
                    st.rerun()
            
            with col2:
                if st.button("🗑️", key=f"delete_{conv_id}"):
                    db.delete_conversation(conv_id)
                    db.delete_conversation_memory(conv_id)  # Eliminar también la memoria
                    if conv_id == st.session_state.current_conversation_id:
                        st.session_state.current_conversation_id = db.create_conversation()
                        st.session_state.agents["conversational"].set_conversation_id(
                            st.session_state.current_conversation_id
                        )
                    st.rerun()
    
    # Área principal de chat
    st.title("🤖 Chat Assistant")
    
    messages = db.get_messages(st.session_state.current_conversation_id)
    for message in messages:
        icon = "🤖" if message["role"] == "assistant" else "👤"
        with st.chat_message(message["role"], avatar=icon):
            # Manejar tanto mensajes antiguos como nuevos
            content = message["content"]
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except json.JSONDecodeError:
                    pass
            
            if isinstance(content, dict):
                st.markdown(content["response"])
                if content.get("references"):
                    with st.expander("📚 Referencias utilizadas"):
                        for ref in content["references"]:
                            st.write(ref)
                if content.get("metrics"):
                    # Filtrar las métricas, excluyendo 'preparación'
                    filtered_metrics = {
                        k: v for k, v in content['metrics'].items() 
                        if k != 'preparación'
                    }
                    metrics_text = " | ".join([
                        f"{k}: {v}" for k, v in filtered_metrics.items()
                    ])
                    st.markdown(
                        f"<div style='text-align: right; color: #666; font-size: 0.8em'>{metrics_text}</div>", 
                        unsafe_allow_html=True
                    )
            else:
                st.write(content)
    
    # Campo de entrada
    if prompt := st.chat_input("Mensaje..."):
        # Verificar si se ha seleccionado una base de datos
        if not st.session_state.current_document_db:
            st.error("Por favor, selecciona una base de datos de documentos primero.")
            return
            
        with st.chat_message("user", avatar="👤"):
            st.write(prompt)
        db.save_message(st.session_state.current_conversation_id, "user", prompt)
        
        # Usar el agente conversacional para procesar la consulta
        result = st.session_state.agents["conversational"].process_user_query(prompt)
        
        with st.chat_message("assistant", avatar="🤖"):
            if isinstance(result, dict):
                # Asegurarse de que el resultado es un diccionario Python y no una cadena JSON
                if isinstance(result, str):
                    result = json.loads(result)
                
                # Mostrar la respuesta principal
                st.markdown(result['response'])
                
                # Mostrar referencias si existen
                if result.get('references'):
                    with st.expander("📚 Referencias utilizadas"):
                        for ref in result['references']:
                            st.write(ref)
                
                # Mostrar métricas si existen
                if result.get('metrics'):
                    # Filtrar las métricas, excluyendo 'preparación'
                    filtered_metrics = {
                        k: v for k, v in result['metrics'].items() 
                        if k != 'preparación'
                    }
                    metrics_text = " | ".join([
                        f"{k}: {v}" for k, v in filtered_metrics.items()
                    ])
                    st.markdown(
                        f"<div style='text-align: right; color: #666; font-size: 0.8em'>{metrics_text}</div>", 
                        unsafe_allow_html=True
                    )
            else:
                st.write(result)
        
        # Guardar el mensaje en la base de datos
        if isinstance(result, dict):
            db.save_message(
                st.session_state.current_conversation_id, 
                "assistant", 
                json.dumps(result)  # Convertir el diccionario a JSON string antes de guardarlo
            )
        else:
            db.save_message(st.session_state.current_conversation_id, "assistant", result)
        
        st.rerun()

if __name__ == "__main__":
    main() 