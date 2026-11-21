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

    // 1. Validar Sesión de Inquilino
    const nombreUsuario = localStorage.getItem('usuarioLogueado');
    const dniUsuario = localStorage.getItem('dniLogueado');
    const tipoUsuario = localStorage.getItem('tipoUsuario');

    if (!nombreUsuario || !dniUsuario || tipoUsuario !== 'inquilino') {
        window.location.href = '/index.html'; // Si no es inquilino, pa' fuera
        return;
    }

    // Configurar encabezado
    document.getElementById('cliente-nombre-titulo').textContent = nombreUsuario;

    // Cerrar Sesión
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    // 2. Cargar Datos del Perfil (Reutilizamos la API del Admin!)
    async function cargarMiPerfil() {
        try {
            const res = await fetch(`/api/admin/inquilino/${dniUsuario}`);
            const data = await res.json();

            if (data.success) {
                // Llenar Datos
                const info = data.info;
                const badgeEstado = document.getElementById('cliente-estado');
                badgeEstado.textContent = info.estado;
                badgeEstado.className = `badge ${info.estado}`;

                document.getElementById('cliente-dni').textContent = info.dni;
                document.getElementById('cliente-puesto').textContent = info.puesto || 'Ninguno';
                document.getElementById('cliente-celular').textContent = info.celular || 'No registrado';
                document.getElementById('cliente-direccion').textContent = info.direccion || 'No registrada';
                document.getElementById('cliente-saldo').textContent = parseFloat(info.saldo).toFixed(2);

                // Llenar Deudas
                const tbodyDeudas = document.getElementById('tabla-deudas-cliente');
                tbodyDeudas.innerHTML = '';
                let totalDeuda = 0;

                if (data.deudas.length === 0) {
                    tbodyDeudas.innerHTML = '<tr><td colspan="6" style="text-align:center;">¡Felicidades! Estás al día.</td></tr>';
                } else {
                    data.deudas.forEach(d => {
                        totalDeuda += parseFloat(d.monto);
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${d.tipo}</td>
                            <td><span class="badge ${d.estado}">${d.estado}</span></td>
                            <td>${d.puesto_codigo}</td>
                            <td>${new Date(d.fecha_emision).toLocaleDateString('es-PE')}</td>
                            <td style="font-weight:bold;">S/. ${d.monto}</td>
                            <td>
                                <button class="btn-accion-pago btn-pagar-mia" data-id="${d.id}"><i class="fa-solid fa-money-bill-wave"></i> Pagar</button>
                            </td>
                        `;
                        tbodyDeudas.appendChild(tr);
                    });
                }
                document.getElementById('cliente-total-deuda').textContent = totalDeuda.toFixed(2);

                // Llenar Pagos Realizados
                const tbodyPagos = document.getElementById('tabla-pagos-cliente');
                tbodyPagos.innerHTML = '';
                if (data.pagos.length === 0) {
                    tbodyPagos.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay historial de pagos recientes.</td></tr>';
                } else {
                    data.pagos.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.detalle}</td>
                            <td><span class="badge Pagado">Completado</span></td>
                            <td>${p.puesto_codigo || '-'}</td>
                            <td>${new Date(p.fecha_pago).toLocaleDateString('es-PE')}</td>
                            <td>S/. ${p.monto}</td>
                        `;
                        tbodyPagos.appendChild(tr);
                    });
                }

                asignarEventosPagar();
            }
        } catch (error) {
            console.error('Error cargando el perfil:', error);
        }
    }

    // 3. Lógica para Pagar una Deuda
    function asignarEventosPagar() {
        document.querySelectorAll('.btn-pagar-mia').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idDeuda = e.target.closest('button').getAttribute('data-id');
                
                if (confirm('¿Deseas pagar esta deuda usando tu Saldo Disponible?')) {
                    try {
                        const res = await fetch('/api/admin/pagar_deuda', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_deuda: idDeuda, dni: dniUsuario })
                        });
                        const data = await res.json();
                        
                        alert(data.message); // Avisa si se pagó total, parcial o si no hay fondos
                        
                        if (data.success) {
                            cargarMiPerfil(); // Recarga la pantalla para ver el nuevo saldo
                        }
                    } catch (error) {
                        console.error(error);
                        alert('Ocurrió un error al procesar el pago.');
                    }
                }
            });
        });
    }

    // Arrancar la carga
    cargarMiPerfil();
});