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

    let puestosData = []; 
    let ordenActual = { columna: null, ascendente: true };

    const tbody = document.getElementById('tabla-puestos');
    const inputBusqueda = document.getElementById('input-busqueda');

    // 1. Cargar datos
    async function cargarPuestos() {
        try {
            const res = await fetch('/api/admin/puestos');
            const data = await res.json();
            if (data.success) {
                puestosData = data.puestos;
                renderizarTabla(puestosData);
            }
        } catch (error) {
            console.error("Error cargando puestos:", error);
        }
    }

    // 2. Renderizar Tabla
    function renderizarTabla(datos) {
        tbody.innerHTML = '';
        
        if(datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron resultados</td></tr>';
            return;
        }

        datos.forEach(puesto => {
            const tr = document.createElement('tr');
            tr.classList.add('tr-clickable'); 

            let claseEstadoFisico = puesto.estado_fisico.replace(' ', '-'); 

            let colorDeuda = puesto.estado_pago === 'Atrasado' ? 'color: red; font-weight: bold;' : '';

            tr.innerHTML = `
                <td style="font-weight: bold;">${puesto.codigo}</td>
                <td>${puesto.tipo}</td>
                <td><span class="badge-puesto ${claseEstadoFisico}">${puesto.estado_fisico}</span></td>
                <td style="${colorDeuda}">${puesto.estado_pago}</td>
                <td>${puesto.inquilino}</td>
                <td>S/. ${puesto.deuda}</td>
            `;

            // Redirigir al perfil del puesto (YA ACTIVO, ADIÓS ALERT)
            tr.addEventListener('click', () => {
                localStorage.setItem('puestoSeleccionado', puesto.codigo);
                window.location.href = '/perfil_puesto.html';
            });

            tbody.appendChild(tr);
        });
    }

    // 3. Búsqueda
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = puestosData.filter(p => 
            p.codigo.toLowerCase().includes(termino) || 
            p.inquilino.toLowerCase().includes(termino)
        );
        renderizarTabla(filtrados);
    });

    // 4. Ordenar Columnas
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const columna = th.getAttribute('data-column');
            
            if(ordenActual.columna === columna) {
                ordenActual.ascendente = !ordenActual.ascendente;
            } else {
                ordenActual.columna = columna;
                ordenActual.ascendente = true;
            }

            puestosData.sort((a, b) => {
                const valorA = String(a[columna]).toLowerCase();
                const valorB = String(b[columna]).toLowerCase();
                
                if (valorA < valorB) return ordenActual.ascendente ? -1 : 1;
                if (valorA > valorB) return ordenActual.ascendente ? 1 : -1;
                return 0;
            });

            renderizarTabla(puestosData);
        });
    });

    cargarPuestos();
});