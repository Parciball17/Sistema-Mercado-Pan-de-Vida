document.addEventListener('DOMContentLoaded', () => {
    // 1. Mostrar nombre del administrador (soporta localStorage o sessionStorage)
    const usuario =
        localStorage.getItem('usuarioLogueado') ||
        sessionStorage.getItem('usuarioLogueado') ||
        localStorage.getItem('adminUser') ||
        'Parciball';

    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl) adminNameEl.textContent = usuario;

    // 2. Tema Oscuro (sincronizado con el resto de páginas)
    const btnDarkMode = document.getElementById('btn-dark-mode');

    function actualizarBotonTema(esOscuro) {
        if (!btnDarkMode) return;
        btnDarkMode.innerHTML = esOscuro
            ? '<i class="fa-solid fa-sun"></i> Modo Claro'
            : '<i class="fa-solid fa-moon"></i> Modo Oscuro';
    }

    const modoGuardado =
        localStorage.getItem('darkMode') === 'enabled' ||
        localStorage.getItem('darkMode') === 'true' ||
        localStorage.getItem('theme') === 'dark' ||
        localStorage.getItem('modoOscuro') === 'true';

    if (modoGuardado) {
        document.body.classList.add('dark-mode');
    }
    actualizarBotonTema(modoGuardado);

    if (btnDarkMode) {
        btnDarkMode.addEventListener('click', () => {
            const esOscuro = document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', esOscuro ? 'enabled' : 'disabled');
            localStorage.setItem('theme', esOscuro ? 'dark' : 'light');
            localStorage.setItem('modoOscuro', esOscuro ? 'true' : 'false');
            actualizarBotonTema(esOscuro);
        });
    }

    // 3. Cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            const darkPref = localStorage.getItem('darkMode');
            const themePref = localStorage.getItem('theme');
            localStorage.clear();
            sessionStorage.clear();
            if (darkPref) localStorage.setItem('darkMode', darkPref);
            if (themePref) localStorage.setItem('theme', themePref);
            window.location.href = '/index.html';
        });
    }

    // 4. Referencias del formulario
    const form = document.getElementById('form-registrar-inquilino');
    const dniInput = document.getElementById('dni');
    const celularInput = document.getElementById('celular');
    const selectPuesto = document.getElementById('puesto_codigo');
    const grupoFecha = document.getElementById('grupo-fecha-inicio');
    const fechaInicioInput = document.getElementById('fecha_inicio');
    const errorMsg = document.getElementById('error-registro');
    const btnGuardar = document.getElementById('btn-guardar-inquilino');

    // Fecha actual por defecto en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];
    fechaInicioInput.value = hoy;

    // Restricción numérica en DNI y Celular
    dniInput.addEventListener('input', () => {
        dniInput.value = dniInput.value.replace(/\D/g, '').slice(0, 15);
    });

    celularInput.addEventListener('input', () => {
        celularInput.value = celularInput.value.replace(/\D/g, '').slice(0, 20);
    });

    // Mostrar/ocultar fecha de contrato si selecciona un puesto libre
    selectPuesto.addEventListener('change', () => {
        grupoFecha.style.display = selectPuesto.value ? 'block' : 'none';
    });

    // Cargar puestos con estado = 'Libre' desde el servidor
    async function cargarPuestosLibres() {
        try {
            const res = await fetch('/api/admin/puestos_libres');
            if (!res.ok) return;
            const puestos = await res.json();
            puestos.forEach(p => {
                const option = document.createElement('option');
                option.value = p.codigo;
                option.textContent = `${p.codigo} - ${p.tipo_puesto} (Alquiler: S/. ${parseFloat(p.precio_alquiler).toFixed(2)})`;
                selectPuesto.appendChild(option);
            });
        } catch (err) {
            console.warn('No se pudieron cargar los puestos libres:', err);
        }
    }
    cargarPuestosLibres();

    // 5. Envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = '';

        const dni = dniInput.value.trim();
        const nombres = document.getElementById('nombres').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const celular = celularInput.value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const puesto_codigo = selectPuesto.value || null;
        const fecha_inicio = puesto_codigo ? (fechaInicioInput.value || hoy) : null;

        if (!/^[0-9]{8,15}$/.test(dni)) {
            errorMsg.textContent = 'El DNI debe contener entre 8 y 15 dígitos numéricos.';
            return;
        }

        if (!nombres || !apellidos) {
            errorMsg.textContent = 'Los nombres y apellidos son obligatorios.';
            return;
        }

        btnGuardar.disabled = true;

        try {
            const res = await fetch('/api/admin/registrar_inquilino', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dni,
                    nombres,
                    apellidos,
                    celular,
                    direccion,
                    puesto_codigo,
                    fecha_inicio
                })
            });

            const data = await res.json();

            if (data.success) {
                alert(data.message || 'Inquilino registrado exitosamente.');
                window.location.href = '/inquilinos_admin.html';
            } else {
                errorMsg.textContent = data.message || 'No se pudo registrar al inquilino.';
            }
        } catch (error) {
            console.error('Error al registrar inquilino:', error);
            errorMsg.textContent = 'Error de conexión con el servidor.';
        } finally {
            btnGuardar.disabled = false;
        }
    });
});