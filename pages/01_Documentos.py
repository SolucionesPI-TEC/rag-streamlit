import streamlit as st
import PyPDF2
import io
from datetime import datetime
import document_db_manager as db
from agents.semantic_db_agent import SemanticDBAgent
from docx import Document
import os

def extract_text_from_pdf(pdf_file):
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(docx_file):
    doc = Document(docx_file)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_from_txt(txt_file):
    return txt_file.getvalue().decode('utf-8')

def extract_text(file):
    file_extension = file.name.split('.')[-1].lower()
    
    if file_extension == 'pdf':
        return extract_text_from_pdf(file)
    elif file_extension == 'docx':
        return extract_text_from_docx(file)
    elif file_extension == 'txt':
        return extract_text_from_txt(file)
    else:
        raise ValueError(f"Formato de archivo no soportado: {file_extension}")

def main():
    # Inicializar el agente semántico
    semantic_agent = SemanticDBAgent()
    
    # Crear pestañas
    tab1, tab2, tab3 = st.tabs(["📤 Subir Documentos", "🗄️ Gestionar BDs", "📚 Ver Documentos"])
    
    # Tab 2: Gestión de BDs
    with tab2:
        st.title("🗄️ Gestión de Bases de Datos")
        
        # Formulario simple para crear BD
        st.subheader("Crear Nueva Base de Datos")
        with st.form("nueva_bd", clear_on_submit=True):
            nombre_bd = st.text_input("Nombre de la Base de Datos")
            descripcion_bd = st.text_area("Descripción (opcional)")
            crear_bd = st.form_submit_button("Crear Base de Datos")
            
            if crear_bd and nombre_bd:
                db.create_document_database(nombre_bd, descripcion_bd)
                st.success(f"Base de datos '{nombre_bd}' creada con éxito!")
                st.rerun()
        
        # Mostrar BDs existentes
        st.subheader("Bases de Datos Existentes")
        bases_datos = db.get_document_databases()
        
        if not bases_datos:
            st.info("No hay bases de datos creadas todavía")
        else:
            for bd in bases_datos:
                with st.expander(f"📁 {bd['name']}", expanded=False):
                    st.write(f"**ID:** {bd['id']}")
                    if bd['description']:
                        st.write(f"**Descripción:** {bd['description']}")
                    docs = db.get_documents(bd['name'])
                    st.write(f"**Documentos:** {len(docs)}")
                    
                    if st.button("🗑️ Eliminar", key=f"del_{bd['id']}"):
                        db.delete_document_database(bd['id'])
                        st.warning("Base de datos eliminada")
                        st.rerun()
    
    # Tab 1: Subir Documentos
    with tab1:
        st.title("📤 Subir Documentos")
        
        bases_datos = db.get_document_databases()
        if not bases_datos:
            st.warning("⚠️ Primero debes crear una base de datos en la pestaña 'Gestionar BDs'")
        else:
            bd_seleccionada = st.selectbox(
                "Seleccionar Base de Datos",
                options=bases_datos,
                format_func=lambda x: x['name']
            )
            
            archivos = st.file_uploader(
                "Selecciona archivos PDF, DOCX o TXT", 
                type=['pdf', 'docx', 'txt'], 
                accept_multiple_files=True
            )
            if archivos:
                for archivo in archivos:
                    with st.expander(f"📄 {archivo.name}", expanded=True):
                        titulo = st.text_input(
                            "Título del documento", 
                            value=archivo.name.replace('.pdf', ''),
                            key=f"titulo_{archivo.name}"
                        )
                
                if st.button("Procesar documentos", type="primary"):
                    for archivo in archivos:
                        with st.spinner(f"Procesando {archivo.name}..."):
                            try:
                                # Guardar el archivo físicamente
                                file_path = db.save_file(bd_seleccionada['name'], archivo)
                                
                                # Extraer el texto
                                texto = extract_text(archivo)
                                descripcion = semantic_agent.generate_description(texto)
                                
                                titulo = st.session_state[f"titulo_{archivo.name}"]
                                
                                # Guardar la información en la base de datos
                                db.save_document(
                                    db_name=bd_seleccionada['name'],
                                    title=titulo,
                                    content=texto,
                                    semantic_description=descripcion,
                                    filename=archivo.name  # Agregar el nombre del archivo
                                )
                                
                                st.success(f"¡Documento {archivo.name} procesado con éxito!")
                            except Exception as e:
                                st.error(f"Error al procesar {archivo.name}: {str(e)}")
                    
                    st.rerun()
    
    # Tab 3: Visualización
    with tab3:
        st.title("📚 Documentos Guardados")
        
        bases_datos = db.get_document_databases()
        if not bases_datos:
            st.info("No hay bases de datos creadas")
            return
        
        # Filtro por BD
        todas_bd = {"id": None, "name": "Todas las bases de datos"}
        bd_seleccionada = st.selectbox(
            "Filtrar por Base de Datos",
            options=[todas_bd] + bases_datos,
            format_func=lambda x: x['name']
        )
        
        # Obtener documentos
        documentos = db.get_documents(bd_seleccionada['name'])
        
        if not documentos:
            st.info("No hay documentos en esta base de datos")
        else:
            # Búsqueda
            busqueda = st.text_input("🔍 Buscar en documentos")
            
            docs_filtrados = documentos
            if busqueda:
                docs_filtrados = [
                    doc for doc in documentos
                    if busqueda.lower() in doc['title'].lower() 
                    or busqueda.lower() in doc['semantic_description'].lower()
                    or busqueda.lower() in doc['content'].lower()
                ]
            
            st.write(f"📊 Total documentos encontrados: {len(docs_filtrados)}")
            
            # Mostrar documentos
            for doc in docs_filtrados:
                with st.expander(f"📄 {doc['title']}", expanded=False):
                    # Información básica
                    st.write("### ℹ️ Información Básica")
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"**ID:** {doc['id']}")
                        st.write(f"**Base de Datos:** {doc['database_name']}")
                    with col2:
                        st.write(f"**Fecha de Creación:** {doc['created_at']}")
                        st.write(f"**Tamaño del Contenido:** {len(doc['content'])} caracteres")
                    
                    # Descripción Semántica
                    st.write("### 📝 Descripción Semántica")
                    st.markdown(doc['semantic_description'])
                    
                    # Contenido completo
                    st.write("### 📃 Contenido del Documento")
                    unique_key = f"{doc['database_name']}_{doc['id']}"
                    show_content = st.toggle("Mostrar contenido completo", key=f"toggle_{unique_key}")
                    if show_content:
                        st.text_area("", value=doc['content'], height=300, disabled=True)
                    
                    # Acciones
                    st.write("### 🛠️ Acciones")
                    col1, col2, col3, col4 = st.columns([1,1,1,1])
                    with col1:
                        if st.button("🗑️ Eliminar", key=f"del_doc_{unique_key}"):
                            db.delete_document(doc['database_name'], doc['id'])
                            st.rerun()
                    with col2:
                        if st.button("📋 Copiar Contenido", key=f"copy_content_{unique_key}"):
                            st.write("Contenido copiado al portapapeles!")
                            st.markdown(f"""
                            <textarea id="copy_text_{unique_key}" style="position: absolute; left: -9999px;">
                            {doc['content']}
                            </textarea>
                            <script>
                                var copyText = document.getElementById("copy_text_{unique_key}");
                                copyText.select();
                                document.execCommand("copy");
                            </script>
                            """, unsafe_allow_html=True)
                    with col3:
                        if st.button("📋 Copiar Descripción", key=f"copy_desc_{unique_key}"):
                            st.write("Descripción copiada al portapapeles!")
                            st.markdown(f"""
                            <textarea id="copy_desc_{unique_key}" style="position: absolute; left: -9999px;">
                            {doc['semantic_description']}
                            </textarea>
                            <script>
                                var copyText = document.getElementById("copy_desc_{unique_key}");
                                copyText.select();
                                document.execCommand("copy");
                            </script>
                            """, unsafe_allow_html=True)
                    with col4:
                        if doc.get('filename'):
                            file_path = os.path.join(db.get_documents_folder(doc['database_name']), doc['filename'])
                            if os.path.exists(file_path):
                                with open(file_path, 'rb') as f:
                                    st.download_button(
                                        "⬇️ Descargar archivo",
                                        f,
                                        file_name=doc['filename'],
                                        key=f"download_{unique_key}"
                                    )

if __name__ == "__main__":
    main() 