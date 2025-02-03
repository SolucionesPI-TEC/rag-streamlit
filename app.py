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
                    st.rerun()
            
            with col2:
                if st.button("🗑️", key=f"delete_{conv_id}"):
                    db.delete_conversation(conv_id)
                    if conv_id == st.session_state.current_conversation_id:
                        st.session_state.current_conversation_id = db.create_conversation()
                    st.rerun()
    
    # Área principal de chat
    st.title("🤖 Chat Assistant")
    
    messages = db.get_messages(st.session_state.current_conversation_id)
    for message in messages:
        icon = "🤖" if message["role"] == "assistant" else "👤"
        with st.chat_message(message["role"], avatar=icon):
            # Manejar tanto mensajes antiguos (string) como nuevos (dict)
            if isinstance(message["content"], dict):
                st.write(message["content"]["response"])
                if message["content"]["references"]:
                    with st.expander("📚 Referencias utilizadas"):
                        for ref in message["content"]["references"]:
                            st.write(ref)
            else:
                st.write(message["content"])
    
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
                st.write(result['response'])
                if result['references']:
                    with st.expander("📚 Referencias utilizadas"):
                        for ref in result['references']:
                            st.write(ref)
            else:
                st.write(result)
        
        # Guardar el mensaje completo incluyendo referencias
        if isinstance(result, dict):
            db.save_message(st.session_state.current_conversation_id, "assistant", json.dumps(result))
        else:
            db.save_message(st.session_state.current_conversation_id, "assistant", result)
        
        st.rerun()

if __name__ == "__main__":
    main() 