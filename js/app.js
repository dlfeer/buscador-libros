// ==========================================
// Buscador de Libros - JavaScript Principal
// ==========================================

// Variables globales
const API_BASE_URL = 'https://openlibrary.org';
let librosCache = [];
let libroActual = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    iniciarApp();
});

function iniciarApp() {
    // Configurar eventos según la página actual
    const selectCategorias = document.querySelector('#categorias');
    const favoritosContainer = document.querySelector('#favoritos-container');
    
    if (selectCategorias) {
        // Estamos en index.html
        selectCategorias.addEventListener('change', seleccionarCategoria);
        // Cargar una categoría por defecto (opcional)
        // selectCategorias.value = 'fiction';
        // seleccionarCategoria();
    }
    
    if (favoritosContainer) {
        // Estamos en favoritos.html
        mostrarFavoritos();
    }
}

// ==========================================
// FUNCIONES PARA INDEX.HTML
// ==========================================

async function seleccionarCategoria() {
    const categoria = document.querySelector('#categorias').value;
    const resultadoDiv = document.querySelector('#resultado');
    const loading = document.querySelector('#loading');
    const tituloResultados = document.querySelector('#titulo-resultados');
    
    if (!categoria) {
        resultadoDiv.innerHTML = '';
        tituloResultados.style.display = 'none';
        return;
    }
    
    // Mostrar loading
    loading.style.display = 'block';
    resultadoDiv.innerHTML = '';
    tituloResultados.style.display = 'none';
    
    try {
        // Usar Open Library API - buscar por tema/género
        const response = await fetch(`${API_BASE_URL}/subjects/${categoria}.json?limit=12`);
        const data = await response.json();
        
        librosCache = data.works || [];
        mostrarLibros(librosCache);
        
        tituloResultados.style.display = 'block';
        
    } catch (error) {
        console.error('Error al obtener libros:', error);
        mostrarToast('Error al cargar los libros. Intenta de nuevo.', 'danger');
    } finally {
        loading.style.display = 'none';
    }
}

function mostrarLibros(libros) {
    const resultadoDiv = document.querySelector('#resultado');
    resultadoDiv.innerHTML = '';
    
    if (libros.length === 0) {
        resultadoDiv.innerHTML = '<div class="col-12 text-center"><p>No se encontraron libros en esta categoría.</p></div>';
        return;
    }
    
    libros.forEach(libro => {
        const card = crearCardLibro(libro);
        resultadoDiv.appendChild(card);
    });
}

function crearCardLibro(libro) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4 col-xl-3';
    
    // Obtener imagen de portada (Open Library usa cover_id)
    const imagenUrl = libro.cover_id 
        ? `https://covers.openlibrary.org/b/id/${libro.cover_id}-M.jpg`
        : 'https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada';
    
    col.innerHTML = `
        <div class="card h-100">
            <img src="${imagenUrl}" class="card-img-top" alt="${libro.title}" 
                 onerror="this.src='https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada'">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-truncate" title="${libro.title}">${libro.title}</h5>
                <p class="card-text text-muted small text-truncate">
                    ${libro.authors ? libro.authors.map(a => a.name).join(', ') : 'Autor desconocido'}
                </p>
                <button class="btn btn-custom text-white mt-auto w-100" onclick="abrirModal('${libro.key}')">
                    Ver Detalles
                </button>
            </div>
        </div>
    `;
    
    return col;
}

async function abrirModal(libroKey) {
    // Buscar el libro en el caché o hacer fetch de detalles
    let libro = librosCache.find(l => l.key === libroKey);
    
    if (!libro) {
        // Si no está en caché (viene de favoritos), buscar por key
        try {
            const response = await fetch(`${API_BASE_URL}${libroKey}.json`);
            libro = await response.json();
        } catch (error) {
            console.error('Error al obtener detalles:', error);
            return;
        }
    }
    
    libroActual = libro;
    
    // Llenar el modal
    document.getElementById('modalTitulo').textContent = libro.title;
    document.getElementById('modalDescripcion').textContent = 
        libro.description ? (typeof libro.description === 'string' ? libro.description : libro.description.value) : 
        'No hay descripción disponible para este libro.';
    document.getElementById('modalAutor').textContent = 
        libro.authors ? libro.authors.map(a => a.name).join(', ') : 'Desconocido';
    document.getElementById('modalAnio').textContent = 
        libro.first_publish_year || 'No disponible';
    document.getElementById('modalGenero').textContent = 
        libro.subject ? libro.subject.slice(0, 3).join(', ') : 'No especificado';
    document.getElementById('modalPaginas').textContent = 
        libro.number_of_pages_median || 'No disponible';
    
    // Imagen
    const imagenUrl = libro.cover_id 
        ? `https://covers.openlibrary.org/b/id/${libro.cover_id}-L.jpg`
        : 'https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada';
    document.getElementById('modalImagen').src = imagenUrl;
    
    // Configurar botón de favoritos
    const btnFavorito = document.getElementById('btnFavorito');
    const favoritos = obtenerFavoritos();
    const esFavorito = favoritos.some(f => f.key === libro.key);
    
    actualizarBotonFavorito(esFavorito);
    
    btnFavorito.onclick = () => toggleFavorito(libro);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalLibro'));
    modal.show();
}

function actualizarBotonFavorito(esFavorito) {
    const btnFavorito = document.getElementById('btnFavorito');
    if (esFavorito) {
        btnFavorito.innerHTML = ' Eliminar de Favoritos';
        btnFavorito.classList.remove('btn-favorite');
        btnFavorito.classList.add('btn-secondary');
    } else {
        btnFavorito.innerHTML = 'Guardar en Favoritos';
        btnFavorito.classList.remove('btn-secondary');
        btnFavorito.classList.add('btn-favorite');
    }
}

// ==========================================
// FUNCIONES PARA FAVORITOS (LOCALSTORAGE)
// ==========================================

function obtenerFavoritos() {
    const favoritos = localStorage.getItem('librosFavoritos');
    return favoritos ? JSON.parse(favoritos) : [];
}

function guardarFavoritos(favoritos) {
    localStorage.setItem('librosFavoritos', JSON.stringify(favoritos));
}

function toggleFavorito(libro) {
    let favoritos = obtenerFavoritos();
    const index = favoritos.findIndex(f => f.key === libro.key);
    
    if (index === -1) {
        // Agregar a favoritos
        favoritos.push({
            key: libro.key,
            title: libro.title,
            authors: libro.authors,
            cover_id: libro.cover_id,
            first_publish_year: libro.first_publish_year
        });
        mostrarToast('Libro agregado a favoritos correctamente', 'success');
        actualizarBotonFavorito(true);
    } else {
        // Eliminar de favoritos
        favoritos.splice(index, 1);
        mostrarToast('Libro eliminado de favoritos', 'warning');
        actualizarBotonFavorito(false);
    }
    
    guardarFavoritos(favoritos);
    
    // Si estamos en la página de favoritos, actualizar la vista
    const favoritosContainer = document.querySelector('#favoritos-container');
    if (favoritosContainer) {
        mostrarFavoritos();
    }
}

// ==========================================
// FUNCIONES PARA FAVORITOS.HTML
// ==========================================

function mostrarFavoritos() {
    const container = document.querySelector('#favoritos-container');
    const emptyState = document.querySelector('#empty-state');
    const favoritos = obtenerFavoritos();
    
    container.innerHTML = '';
    
    if (favoritos.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'flex';
    emptyState.style.display = 'none';
    
    favoritos.forEach(libro => {
        const card = crearCardFavorito(libro);
        container.appendChild(card);
    });
}

function crearCardFavorito(libro) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4 col-xl-3';
    
    const imagenUrl = libro.cover_id 
        ? `https://covers.openlibrary.org/b/id/${libro.cover_id}-M.jpg`
        : 'https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada';
    
    col.innerHTML = `
        <div class="card h-100">
            <img src="${imagenUrl}" class="card-img-top" alt="${libro.title}"
                 onerror="this.src='https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada'">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-truncate">${libro.title}</h5>
                <p class="card-text text-muted small">
                    ${libro.authors ? libro.authors.map(a => a.name).join(', ') : 'Autor desconocido'}
                </p>
                <button class="btn btn-custom text-white mt-auto w-100 mb-2" onclick="abrirModalFavorito('${libro.key}')">
                    Ver Detalles
                </button>
                <button class="btn btn-danger text-white w-100" onclick="eliminarFavoritoDirecto('${libro.key}')">
                    Eliminar
                </button>
            </div>
        </div>
    `;
    
    return col;
}

async function abrirModalFavorito(libroKey) {
    // Similar a abrirModal pero para la página de favoritos
    libroActual = { key: libroKey };
    
    // Buscar en favoritos
    const favoritos = obtenerFavoritos();
    const libro = favoritos.find(f => f.key === libroKey);
    
    if (!libro) return;
    
    // Llenar modal simplificado
    document.getElementById('modalTitulo').textContent = libro.title;
    document.getElementById('modalDescripcion').textContent = 'Detalles del libro guardado en favoritos.';
    document.getElementById('modalAutor').textContent = 
        libro.authors ? libro.authors.map(a => a.name).join(', ') : 'Desconocido';
    document.getElementById('modalAnio').textContent = libro.first_publish_year || 'No disponible';
    
    const imagenUrl = libro.cover_id 
        ? `https://covers.openlibrary.org/b/id/${libro.cover_id}-L.jpg`
        : 'https://via.placeholder.com/300x450/4a90e2/ffffff?text=Sin+Portada';
    document.getElementById('modalImagen').src = imagenUrl;
    
    // Configurar botón eliminar
    const btnEliminar = document.getElementById('btnEliminar');
    btnEliminar.onclick = () => {
        eliminarFavoritoDirecto(libro.key);
        bootstrap.Modal.getInstance(document.getElementById('modalLibro')).hide();
    };
    
    const modal = new bootstrap.Modal(document.getElementById('modalLibro'));
    modal.show();
}

function eliminarFavoritoDirecto(libroKey) {
    let favoritos = obtenerFavoritos();
    favoritos = favoritos.filter(f => f.key !== libroKey);
    guardarFavoritos(favoritos);
    mostrarFavoritos();
    mostrarToast('Libro eliminado de favoritos', 'warning');
}

// ==========================================
// UTILIDADES
// ==========================================

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastBody = document.getElementById('toastMensaje');
    
    // Configurar color
    toastEl.className = `toast align-items-center text-white bg-${tipo}`;
    toastBody.textContent = mensaje;
    
    // Mostrar
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}