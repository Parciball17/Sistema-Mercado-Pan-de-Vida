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

    // 1. Validar Seguridad y Cargar Nombre
    const usuario = localStorage.getItem('usuarioLogueado');
    const tipo = localStorage.getItem('tipoUsuario');

    if (!usuario || tipo !== 'administrador') {
        window.location.href = '/index.html';
        return;
    }
    document.getElementById('admin-name').textContent = usuario;

    // 2. Lógica de Cerrar Sesión (preservando preferencia visual de accesibilidad)
    document.getElementById('btn-logout').addEventListener('click', () => {
        const prefDark = localStorage.getItem('darkMode');
        localStorage.clear();
        if (prefDark !== null) localStorage.setItem('darkMode', prefDark);
        window.location.href = '/index.html';
    });

    // 3. Cargar Datos del Dashboard y Cuadrícula 11x10 con Doble Codificación Visual (WCAG 1.4.1)
    try {
        const res = await fetch('/api/admin/dashboard');
        const data = await res.json();

        if (data.success) {
            document.getElementById('stat-ocupados').textContent = data.stats.ocupados;
            document.getElementById('stat-ingresos').textContent = data.stats.ingresos;
            document.getElementById('stat-aldia').textContent = data.stats.alDia;
            document.getElementById('stat-pendientes').textContent = data.stats.pendientes;

            const etiquetasEstado = {
                verde: 'Al Día',
                amarillo: 'Pendiente',
                rojo: 'Vencido',
                gris: 'Bloqueado',
                blanco: 'Libre'
            };

            const gridContainer = document.getElementById('puestos-grid');
            gridContainer.innerHTML = '';

            data.grid.forEach(puesto => {
                const div = document.createElement('div');
                const estadoTexto = etiquetasEstado[puesto.color] || 'Libre';

                div.classList.add('puesto-box', puesto.color);
                div.setAttribute('role', 'button');
                div.setAttribute('tabindex', '0');
                div.setAttribute(
                    'aria-label',
                    `Puesto ${puesto.codigo}, Tipo ${puesto.tipo_puesto || 'Estándar'}, Inquilino: ${puesto.nombres || 'Libre'}, Estado: ${estadoTexto}`
                );
                div.title = `Puesto ${puesto.codigo} | Inquilino: ${puesto.nombres || 'Libre'} | Estado: ${estadoTexto}`;

                div.innerHTML = `
                    <span class="codigo-puesto">${puesto.codigo}</span>
                    <small class="indicador-accesible">${estadoTexto}</small>
                `;

                const irAPuesto = () => {
                    localStorage.setItem('puestoSeleccionado', puesto.codigo);
                    window.location.href = '/perfil_puesto.html';
                };

                div.addEventListener('click', irAPuesto);
                div.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        irAPuesto();
                    }
                });

                gridContainer.appendChild(div);
            });

            const tbody = document.getElementById('tabla-pagos');
            tbody.innerHTML = '';
            data.pagos.forEach(pago => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${pago.nombre}</td>
                    <td><span class="badge Activo">${pago.tipo}</span></td>
                    <td>${pago.dni}</td>
                    <td>${pago.fecha}</td>
                    <td>S/. ${parseFloat(pago.pago).toFixed(2)}</td>
                    <td>S/. ${parseFloat(pago.saldo).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
});