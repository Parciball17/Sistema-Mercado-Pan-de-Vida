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
    if (!usuario || localStorage.getItem('tipoUsuario') !== 'administrador') {
        window.location.href = '/index.html';
        return;
    }
    document.getElementById('admin-name').textContent = usuario;
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    let transaccionesGenerales = [];

    // --- 1. TABLA GENERAL Y FILTROS ---
    async function cargarTransacciones() {
        try {
            const res = await fetch('/api/admin/transacciones');
            const data = await res.json();
            if (data.success) {
                transaccionesGenerales = data.transacciones;
                aplicarFiltros(); 
            }
        } catch (error) { console.error(error); }
    }

    function aplicarFiltros() {
        const mesAttr = document.getElementById('filtro-mes').value; // Ej: "2026-10"
        const tipoAttr = document.getElementById('filtro-tipo').value;

        const filtradas = transaccionesGenerales.filter(t => {
            let pasaMes = true;
            let pasaTipo = true;

            if (mesAttr) {
                const fechaT = new Date(t.fecha_pago).toISOString().slice(0, 7); // Formato YYYY-MM
                if (fechaT !== mesAttr) pasaMes = false;
            }
            if (tipoAttr && t.tipo !== tipoAttr) pasaTipo = false;

            return pasaMes && pasaTipo;
        });

        renderizarTablaGeneral(filtradas);
    }

    document.getElementById('filtro-mes').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltros);

    function renderizarTablaGeneral(datos) {
        const tbody = document.getElementById('tabla-general');
        tbody.innerHTML = '';
        if (datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay registros</td></tr>';
            return;
        }

        datos.forEach(t => {
            const tr = document.createElement('tr');
            let colorTipo = t.tipo === 'Ingreso' ? 'color: var(--color-verde-oscuro); font-weight: bold;' : 'color: var(--color-error); font-weight: bold;';
            
            tr.innerHTML = `
                <td style="${colorTipo}">${t.tipo}</td>
                <td>${t.usuario}</td>
                <td>${t.detalle}</td>
                <td>${new Date(t.fecha_pago).toLocaleDateString('es-PE')}</td>
                <td>S/. ${t.monto}</td>
                <td>
                    ${t.dni ? `<button class="btn-text btn-buscar" data-dni="${t.dni}"><i class="fa-solid fa-eye"></i> Buscar</button>` : ''}
                    <button class="btn-borrar btn-borrar-transaccion" data-id="${t.id}" style="padding: 4px 8px; font-size:12px;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Evento Buscar (Redirige al perfil)
        document.querySelectorAll('.btn-buscar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dni = e.target.closest('button').getAttribute('data-dni');
                localStorage.setItem('dniSeleccionado', dni);
                window.location.href = '/perfil_inquilino.html';
            });
        });

        // Evento Borrar
        document.querySelectorAll('.btn-borrar-transaccion').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                const pwd = prompt("Ingrese contraseña de administrador para borrar la transacción:");
                if (pwd) {
                    const res = await fetch('/api/admin/borrar_transaccion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, password: pwd })
                    });
                    const data = await res.json();
                    if (data.success) cargarTransacciones();
                    else alert(data.message);
                }
            });
        });
    }

    // --- 2. AGREGAR MANUALMENTE ---
    async function agregarTransaccion(tipo) {
        const detalle = prompt(`Ingrese el detalle del ${tipo} (Ej: Pago a Sedapal, Donación, etc.):`);
        if (!detalle) return;
        const usuario = prompt(`Ingrese el nombre de la Entidad o Persona (Ej: Sedapal, Sunat, Cliente X):`);
        if (!usuario) return;
        const monto = prompt(`Ingrese el monto total en Soles (Ej: 1500.50):`);
        if (monto && !isNaN(monto)) {
            const fechaActual = new Date().toISOString().split('T')[0];
            const res = await fetch('/api/admin/agregar_transaccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, detalle, usuario, monto, fecha: fechaActual })
            });
            const data = await res.json();
            if(data.success) cargarTransacciones();
        }
    }
    document.getElementById('btn-add-egreso').addEventListener('click', () => agregarTransaccion('Egreso'));
    document.getElementById('btn-add-ingreso').addEventListener('click', () => agregarTransaccion('Ingreso'));


    // --- 3. CÁLCULO POR PERIODO ---
    document.getElementById('btn-calcular').addEventListener('click', async () => {
        const inicio = document.getElementById('fecha-inicio').value;
        const fin = document.getElementById('fecha-fin').value;

        if(!inicio || !fin) { alert("Seleccione ambas fechas"); return; }
        
        const fechaIn = new Date(inicio);
        const fechaOut = new Date(fin);
        const difTiempo = Math.abs(fechaOut - fechaIn);
        const dias = Math.ceil(difTiempo / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día final

        try {
            const res = await fetch(`/api/admin/transacciones?inicio=${inicio}&fin=${fin}`);
            const data = await res.json();

            if(data.success) {
                const trs = data.transacciones;
                let cIng = 0, cEgr = 0, tIng = 0, tEgr = 0;

                const tbodyP = document.getElementById('tabla-periodo');
                tbodyP.innerHTML = '';

                trs.forEach(t => {
                    const monto = parseFloat(t.monto);
                    if (t.tipo === 'Ingreso') { cIng++; tIng += monto; } 
                    else { cEgr++; tEgr += monto; }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${t.tipo}</td>
                        <td>${t.usuario}</td>
                        <td>${t.detalle}</td>
                        <td>${new Date(t.fecha_pago).toLocaleDateString('es-PE')}</td>
                        <td>S/. ${monto.toFixed(2)}</td>
                    `;
                    tbodyP.appendChild(tr);
                });

                if(trs.length === 0) tbodyP.innerHTML = '<tr><td colspan="5" style="text-align: center;">Sin datos en este periodo</td></tr>';

                // Actualizar Stats
                document.getElementById('res-dias').textContent = dias;
                document.getElementById('res-datos').textContent = trs.length;
                document.getElementById('res-cant-ing').textContent = cIng;
                document.getElementById('res-tot-ing').textContent = `S/. ${tIng.toFixed(2)}`;
                document.getElementById('res-cant-egr').textContent = cEgr;
                document.getElementById('res-tot-egr').textContent = `S/. ${tEgr.toFixed(2)}`;
                
                const ganancia = tIng - tEgr;
                const txtGanancia = document.getElementById('res-ganancia');
                txtGanancia.textContent = `S/. ${ganancia.toFixed(2)}`;
                txtGanancia.style.color = ganancia >= 0 ? 'var(--color-verde-oscuro)' : 'var(--color-error)';
            }
        } catch(e) { console.error(e); }
    });

    // Exportar Excel
    document.getElementById('btn-exportar').addEventListener('click', () => {
        const inicio = document.getElementById('fecha-inicio').value;
        const fin = document.getElementById('fecha-fin').value;
        let tabla = document.getElementById("tabla-exportar");
        let html = tabla.outerHTML;
        let url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(html);
        let link = document.createElement("a");
        link.href = url;
        link.download = `Reporte_${inicio}_al_${fin}.xls`;
        link.click();
    });

    cargarTransacciones();
});