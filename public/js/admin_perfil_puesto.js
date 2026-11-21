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

    const usuario = localStorage.getItem('usuarioLogueado');
    const codigoPuesto = localStorage.getItem('puestoSeleccionado');

    if (!usuario || localStorage.getItem('tipoUsuario') !== 'administrador' || !codigoPuesto) {
        window.location.href = '/puestos_admin.html';
        return;
    }
    document.getElementById('admin-name').textContent = usuario;
    document.getElementById('puesto-codigo-titulo').textContent = codigoPuesto;

    document.getElementById('btn-logout').addEventListener('click', () => {
        const prefDark = localStorage.getItem('darkMode');
        localStorage.clear();
        if (prefDark !== null) localStorage.setItem('darkMode', prefDark);
        window.location.href = '/index.html';
    });

    const bloqueAsignar = document.getElementById('bloque-asignar-inquilino');
    const selectInquilino = document.getElementById('select-inquilino-asignar');
    const fechaInicioInput = document.getElementById('fecha-inicio-asignar');
    const btnAsignar = document.getElementById('btn-asignar-inquilino');

    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInicioInput) fechaInicioInput.value = hoy;

    let puestoInfoActual = null;

    async function cargarInquilinosDisponibles() {
        try {
            const res = await fetch('/api/admin/inquilinos_disponibles');
            const data = await res.json();
            selectInquilino.innerHTML = '<option value="">-- Seleccione un inquilino --</option>';

            if (data.success && data.inquilinos.length > 0) {
                data.inquilinos.forEach(inq => {
                    const opt = document.createElement('option');
                    opt.value = inq.dni;
                    opt.textContent = `${inq.nombres} ${inq.apellidos} (DNI: ${inq.dni})`;
                    selectInquilino.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No hay inquilinos inactivos disponibles';
                selectInquilino.appendChild(opt);
            }
        } catch (error) {
            console.error('Error al cargar inquilinos disponibles:', error);
        }
    }

    async function cargarPerfilPuesto() {
        try {
            const res = await fetch(`/api/admin/puesto/${codigoPuesto}`);
            const data = await res.json();

            if (data.success) {
                puestoInfoActual = data.info;

                document.getElementById('p-tamanio').textContent = data.info.tamanio;
                document.getElementById('p-puertas').textContent = data.info.puertas;
                document.getElementById('p-alquiler').textContent = data.info.precio_alquiler;
                document.getElementById('p-luz').textContent = data.info.precio_luz;
                document.getElementById('p-agua').textContent = data.info.precio_agua;
                document.getElementById('p-mantenimiento').textContent = data.info.precio_mantenimiento;
                document.getElementById('p-vigilancia').textContent = data.info.precio_vigilancia;

                const totalMensual = parseFloat(data.info.precio_alquiler) + parseFloat(data.info.precio_luz) +
                    parseFloat(data.info.precio_agua) + parseFloat(data.info.precio_mantenimiento) +
                    parseFloat(data.info.precio_vigilancia);
                document.getElementById('p-total').textContent = totalMensual.toFixed(2);

                document.getElementById('p-inquilino').textContent = data.info.inquilino_dni ? `${data.info.nombres} ${data.info.apellidos}` : 'Libre';
                document.getElementById('p-dni').textContent = data.info.inquilino_dni || '-';
                document.getElementById('p-estado-inq').textContent = data.info.estado_inquilino || '-';
                document.getElementById('p-inicio').textContent = data.info.fecha_inicio ? new Date(data.info.fecha_inicio).toLocaleDateString('es-PE') : '-';
                document.getElementById('p-fin').textContent = data.info.fecha_vencimiento ? new Date(data.info.fecha_vencimiento).toLocaleDateString('es-PE') : '-';

                const badgeFisico = document.getElementById('p-estado-fisico');
                badgeFisico.textContent = data.info.estado;
                badgeFisico.className = `badge-puesto ${data.info.estado.replace(' ', '-')}`;

                const btnInhabilitar = document.getElementById('btn-inhabilitar');
                if (data.info.estado === 'Bloqueado') {
                    btnInhabilitar.style.display = 'inline-block';
                    btnInhabilitar.innerHTML = '<i class="fa-solid fa-unlock"></i> Habilitar Puesto';
                    btnInhabilitar.style.backgroundColor = 'var(--color-verde-limon)';
                    bloqueAsignar.style.display = 'none';
                } else if (data.info.estado === 'Libre') {
                    btnInhabilitar.style.display = 'none';
                    bloqueAsignar.style.display = 'block';
                    cargarInquilinosDisponibles();
                } else {
                    btnInhabilitar.style.display = 'inline-block';
                    btnInhabilitar.innerHTML = '<i class="fa-solid fa-lock"></i> Bloquear Puesto';
                    btnInhabilitar.style.backgroundColor = '#fde047';
                    bloqueAsignar.style.display = 'none';
                }

                document.getElementById('btn-dar-baja').style.display = data.info.inquilino_dni ? 'inline-block' : 'none';

                const tbody = document.getElementById('tabla-deudas-puesto');
                tbody.innerHTML = '';
                if (!data.deudas || data.deudas.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${data.info.inquilino_dni ? 'Al Día. No hay deudas.' : 'Puesto Libre'}</td></tr>`;
                } else {
                    data.deudas.forEach(d => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${d.tipo}</td>
                            <td><span class="badge ${d.estado}" aria-label="Estado: ${d.estado}">${d.estado}</span></td>
                            <td>${new Date(d.fecha_emision).toLocaleDateString('es-PE')}</td>
                            <td style="font-weight:bold;">S/. ${parseFloat(d.monto).toFixed(2)}</td>
                            <td>
                                <button type="button" class="btn-borrar btn-borrar-deuda" data-id="${d.id}" aria-label="Borrar deuda ${d.tipo}"><i class="fa-solid fa-trash"></i> Borrar</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });

                    document.querySelectorAll('.btn-borrar-deuda').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const idDeuda = e.target.closest('button').getAttribute('data-id');
                            if (confirm('¿Está seguro de borrar esta deuda del registro?')) {
                                const password = prompt('⚠️ Acción destructiva: Ingrese su contraseña de Administrador para confirmar el borrado:');
                                if (!password) return;
                                try {
                                    const res = await fetch('/api/admin/borrar_deuda', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id_deuda: idDeuda, password })
                                    });
                                    const result = await res.json();
                                    if (result.success) cargarPerfilPuesto();
                                    else alert(result.message || 'Contraseña incorrecta.');
                                } catch (err) { console.error(err); }
                            }
                        });
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Asignar inquilino disponible al puesto libre
    if (btnAsignar) {
        btnAsignar.addEventListener('click', async () => {
            const dni = selectInquilino.value;
            const fecha_inicio = fechaInicioInput.value || hoy;

            if (!dni) {
                alert('Por favor, seleccione un inquilino de la lista.');
                return;
            }

            if (!confirm(`¿Desea asignar el puesto ${codigoPuesto} al inquilino seleccionado?`)) {
                return;
            }

            btnAsignar.disabled = true;
            try {
                const res = await fetch('/api/admin/asignar_inquilino_puesto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codigo: codigoPuesto, dni, fecha_inicio })
                });
                const data = await res.json();
                alert(data.message);
                if (data.success) {
                    cargarPerfilPuesto();
                }
            } catch (error) {
                console.error('Error al asignar inquilino:', error);
                alert('Error de conexión al asignar el inquilino.');
            } finally {
                btnAsignar.disabled = false;
            }
        });
    }

    document.querySelectorAll('.btn-cambiar-precio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const columna = e.target.getAttribute('data-col');
            const nuevoPrecio = prompt('Ingrese el nuevo monto en Soles (Ej. 350.00):');
            if (nuevoPrecio && !isNaN(nuevoPrecio)) {
                const password = prompt('Ingrese su contraseña de administrador para confirmar:');
                if (password) {
                    const res = await fetch('/api/admin/modificar_precio_puesto', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ codigo: codigoPuesto, columna, nuevoPrecio, password })
                    });
                    const data = await res.json();
                    alert(data.message);
                    if (data.success) cargarPerfilPuesto();
                }
            }
        });
    });

    document.getElementById('btn-inhabilitar').addEventListener('click', async () => {
        if (confirm(`¿Desea cambiar el estado físico del puesto a ${puestoInfoActual.estado === 'Bloqueado' ? 'En Uso' : 'Bloqueado'}?`)) {
            const res = await fetch('/api/admin/toggle_estado_puesto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: codigoPuesto, estadoActual: puestoInfoActual.estado })
            });
            const data = await res.json();
            if (data.success) cargarPerfilPuesto();
        }
    });

    document.getElementById('btn-dar-baja').addEventListener('click', async () => {
        if (puestoInfoActual.estado !== 'Bloqueado') {
            alert('Restricción de seguridad: Primero debes Bloquear (Inhabilitar) el puesto antes de dar de baja al inquilino.');
            return;
        }
        if (confirm('¿Estás 100% seguro de dar de baja a este inquilino? Se desvinculará del puesto permanentemente.')) {
            const password = prompt('⚠️ Acción destructiva: Ingrese su contraseña de Administrador para confirmar la baja:');
            if (!password) return;
            const res = await fetch('/api/admin/dar_baja_inquilino', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: codigoPuesto, dni: puestoInfoActual.inquilino_dni, password })
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) cargarPerfilPuesto();
        }
    });

    document.getElementById('btn-agregar-deuda').addEventListener('click', async () => {
        if (!puestoInfoActual.inquilino_dni) {
            alert('No hay inquilino asignado para cobrarle una deuda.');
            return;
        }
        const tipo = prompt('Ingrese el Concepto de Deuda (Ej. Multa, Alquiler, Luz, Agua, Mantenimiento, Vigilancia):');
        if (!tipo) return;
        const monto = prompt('Ingrese el monto de la deuda en Soles (Ej. 25.00):');
        if (monto && !isNaN(monto)) {
            const res = await fetch('/api/admin/agregar_deuda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: puestoInfoActual.inquilino_dni, puesto: codigoPuesto, tipo, monto })
            });
            const data = await res.json();
            if (data.success) cargarPerfilPuesto();
        }
    });

    cargarPerfilPuesto();
});