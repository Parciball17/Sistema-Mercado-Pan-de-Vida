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
    const dniInquilino = localStorage.getItem('dniSeleccionado');

    if (!usuario || localStorage.getItem('tipoUsuario') !== 'administrador' || !dniInquilino) {
        window.location.href = '/inquilinos_admin.html';
        return;
    }
    document.getElementById('admin-name').textContent = usuario;

    document.getElementById('btn-logout').addEventListener('click', () => {
        const prefDark = localStorage.getItem('darkMode');
        localStorage.clear();
        if (prefDark !== null) localStorage.setItem('darkMode', prefDark);
        window.location.href = '/index.html';
    });

    async function cargarPerfil() {
        try {
            const res = await fetch(`/api/admin/inquilino/${dniInquilino}`);
            const data = await res.json();

            if (data.success) {
                document.getElementById('prof-nombre').textContent = `${data.info.nombres} ${data.info.apellidos}`;
                const badgeEstado = document.getElementById('prof-estado');
                badgeEstado.textContent = data.info.estado;
                badgeEstado.className = `badge ${data.info.estado}`;

                document.getElementById('prof-dni').textContent = data.info.dni;
                document.getElementById('prof-puesto').textContent = data.info.puesto || 'Ninguno';
                document.getElementById('prof-celular').textContent = data.info.celular || 'No registrado';
                document.getElementById('prof-direccion').textContent = data.info.direccion || 'No registrada';
                document.getElementById('prof-saldo').textContent = parseFloat(data.info.saldo || 0).toFixed(2);

                const tbodyDeudas = document.getElementById('tabla-deudas');
                tbodyDeudas.innerHTML = '';
                let totalDeuda = 0;

                if (data.deudas.length === 0) {
                    tbodyDeudas.innerHTML = '<tr><td colspan="6" style="text-align:center;">Al Día - No presenta deudas pendientes</td></tr>';
                } else {
                    data.deudas.forEach(d => {
                        totalDeuda += parseFloat(d.monto);
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${d.tipo}</td>
                            <td><span class="badge ${d.estado}" aria-label="Estado de deuda: ${d.estado}">${d.estado}</span></td>
                            <td>${d.puesto_codigo}</td>
                            <td>${new Date(d.fecha_emision).toLocaleDateString('es-PE')}</td>
                            <td style="font-weight:bold;">S/. ${parseFloat(d.monto).toFixed(2)}</td>
                            <td>
                                <button type="button" class="btn-accion-pago btn-pagar" data-id="${d.id}" aria-label="Pagar deuda de ${d.tipo}"><i class="fa-solid fa-money-bill-wave"></i> Pagar</button>
                                <button type="button" class="btn-borrar btn-borrar-deuda" data-id="${d.id}" aria-label="Borrar deuda de ${d.tipo}"><i class="fa-solid fa-trash"></i> Borrar</button>
                            </td>
                        `;
                        tbodyDeudas.appendChild(tr);
                    });
                }
                document.getElementById('total-deuda').textContent = totalDeuda.toFixed(2);

                const tbodyPagos = document.getElementById('tabla-pagos');
                tbodyPagos.innerHTML = '';
                if (data.pagos.length === 0) {
                    tbodyPagos.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay historial de pagos</td></tr>';
                } else {
                    data.pagos.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${p.detalle}</td>
                            <td><span class="badge Pagado">Completado</span></td>
                            <td>${p.puesto_codigo || '-'}</td>
                            <td>${new Date(p.fecha_pago).toLocaleDateString('es-PE')}</td>
                            <td>S/. ${parseFloat(p.monto).toFixed(2)}</td>
                        `;
                        tbodyPagos.appendChild(tr);
                    });
                }

                asignarEventosBotones();
            }
        } catch (error) {
            console.error(error);
            alert('Error al conectar con el servidor.');
        }
    }

    function asignarEventosBotones() {
        document.querySelectorAll('.btn-pagar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idDeuda = e.target.closest('button').getAttribute('data-id');
                if (confirm('¿Desea pagar esta deuda utilizando el Saldo a favor del inquilino?')) {
                    try {
                        const res = await fetch('/api/admin/pagar_deuda', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_deuda: idDeuda, dni: dniInquilino })
                        });
                        const data = await res.json();
                        alert(data.message);
                        if (data.success) cargarPerfil();
                    } catch (err) { console.error(err); }
                }
            });
        });

        // Prevención de errores financieros (WCAG 3.3.4): Confirmación + Contraseña de Administrador
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
                        const data = await res.json();
                        if (data.success) cargarPerfil();
                        else alert(data.message || 'Contraseña incorrecta.');
                    } catch (err) { console.error(err); }
                }
            });
        });
    }

    document.getElementById('btn-modificar-saldo').addEventListener('click', async () => {
        const nuevoSaldo = prompt('Ingrese el nuevo monto total para el Saldo a favor (Ej: 50.00):');
        if (nuevoSaldo && !isNaN(nuevoSaldo)) {
            const password = prompt('Ingrese su contraseña de Administrador para confirmar:');
            if (password) {
                try {
                    const res = await fetch('/api/admin/modificar_saldo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dni: dniInquilino, nuevoSaldo, password })
                    });
                    const data = await res.json();
                    alert(data.message);
                    if (data.success) cargarPerfil();
                } catch (error) { console.error(error); }
            }
        } else if (nuevoSaldo) {
            alert('Por favor ingrese un número válido.');
        }
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
        const tabla = document.getElementById('tabla-historial');
        const html = tabla.outerHTML;
        const url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(html);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Pagos_${dniInquilino}.xls`;
        link.click();
    });

    cargarPerfil();
});