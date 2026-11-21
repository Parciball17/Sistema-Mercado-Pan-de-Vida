document.addEventListener('DOMContentLoaded', async () => {

    // Inicializar Modo Oscuro Persistente (WCAG 1.4.3)
    const btnDarkMode = document.getElementById('btn-dark-mode');
    const aplicarTema = (esOscuro) => {
        document.body.classList.toggle('dark-mode', esOscuro);
        if (btnDarkMode) {
            btnDarkMode.innerHTML = esOscuro
                ? '<i class="fa-solid fa-sun"></i> Modo Claro'
                : '<i class="fa-solid fa-moon"></i> Modo Oscuro';
        }
    };
    aplicarTema(localStorage.getItem('darkMode') === 'true');
    if (btnDarkMode) {
        btnDarkMode.addEventListener('click', () => {
            const nuevoEstado = !document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', nuevoEstado);
            aplicarTema(nuevoEstado);
        });
    }
    
    // Validar sesión
    const usuario = localStorage.getItem('usuarioLogueado');
    if (!usuario || localStorage.getItem('tipoUsuario') !== 'administrador') {
        window.location.href = '/index.html';
        return;
    }
    document.getElementById('admin-name').textContent = usuario;

    // Cerrar sesión
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    let inquilinosData = []; // Guardamos la data original aquí para buscar y ordenar
    let ordenActual = { columna: null, ascendente: true };

    const tbody = document.getElementById('tabla-inquilinos');
    const inputBusqueda = document.getElementById('input-busqueda');

    // 1. Cargar datos del Backend
    async function cargarInquilinos() {
        try {
            const res = await fetch('/api/admin/inquilinos');
            const data = await res.json();
            if (data.success) {
                inquilinosData = data.inquilinos;
                renderizarTabla(inquilinosData);
            }
        } catch (error) {
            console.error("Error cargando inquilinos:", error);
        }
    }

    // 2. Renderizar Tabla
    function renderizarTabla(datos) {
        tbody.innerHTML = ''; // Limpiar
        
        if(datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No se encontraron resultados</td></tr>';
            return;
        }

        datos.forEach(inquilino => {
            const tr = document.createElement('tr');
            tr.classList.add('tr-clickable'); // Para efecto visual
            
            // Si el estado de pago es Atrasado, se pinta de rojo la celda
            let colorDeuda = inquilino.estado_pago === 'Atrasado' ? 'color: red; font-weight: bold;' : '';

            tr.innerHTML = `
                <td>${inquilino.nombre}</td>
                <td>${inquilino.tipo}</td>
                <td>${inquilino.estado}</td>
                <td>${inquilino.dni}</td>
                <td>${inquilino.puesto}</td>
                <td style="${colorDeuda}">${inquilino.estado_pago}</td>
                <td>S/. ${inquilino.deuda_activa}</td>
                <td><button class="btn-borrar" data-dni="${inquilino.dni}"><i class="fa-solid fa-trash"></i> Borrar</button></td>
            `;

            // Al hacer clic en cualquier parte de la fila (menos en el botón borrar), vamos al perfil
            tr.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-borrar')) {
                    localStorage.setItem('dniSeleccionado', inquilino.dni);
                    window.location.href = '/perfil_inquilino.html';
                }
            });

            tbody.appendChild(tr);
        });

        // Asignar evento de borrado a los botones generados
        document.querySelectorAll('.btn-borrar').forEach(btn => {
            btn.addEventListener('click', borrarInquilino);
        });
    }

    // 3. Función de Búsqueda (Filtro por Nombre o DNI)
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = inquilinosData.filter(i => 
            i.nombre.toLowerCase().includes(termino) || 
            i.dni.includes(termino)
        );
        renderizarTabla(filtrados);
    });

    // 4. Función para Ordenar Columnas
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const columna = th.getAttribute('data-column');
            
            // Alternar dirección si se hace clic en la misma columna
            if(ordenActual.columna === columna) {
                ordenActual.ascendente = !ordenActual.ascendente;
            } else {
                ordenActual.columna = columna;
                ordenActual.ascendente = true;
            }

            // Ordenar el arreglo
            inquilinosData.sort((a, b) => {
                const valorA = String(a[columna]).toLowerCase();
                const valorB = String(b[columna]).toLowerCase();
                
                if (valorA < valorB) return ordenActual.ascendente ? -1 : 1;
                if (valorA > valorB) return ordenActual.ascendente ? 1 : -1;
                return 0;
            });

            renderizarTabla(inquilinosData);
        });
    });

    // 5. Función para Borrar con validación de contraseña
    async function borrarInquilino(e) {
        const dni = e.target.closest('.btn-borrar').getAttribute('data-dni');
        
        // Solicitar contraseña mediante un prompt clásico del navegador
        const passwordAdmin = prompt("⚠️ Acción requerida: Ingrese su contraseña de administrador para confirmar el borrado:");
        
        if (passwordAdmin) {
            try {
                const response = await fetch('/api/admin/borrar_inquilino', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni: dni, password: passwordAdmin })
                });

                const data = await response.json();
                if (data.success) {
                    alert('Inquilino eliminado del sistema.');
                    cargarInquilinos(); // Recargar la tabla
                } else {
                    alert('Error: ' + data.message); // Contraseña incorrecta
                }
            } catch (error) {
                console.error(error);
                alert('Ocurrió un error en la conexión.');
            }
        }
    }

    // Iniciar
    cargarInquilinos();


});