document.addEventListener('DOMContentLoaded', () => {
    // 0. Modo Oscuro Persistente (WCAG 1.4.3)
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

    // 1. Manejo de Pestañas (Admin / Inquilino)
    const btnAdmin = document.getElementById('btn-tab-admin');
    const btnInquilino = document.getElementById('btn-tab-inquilino');
    const formAdmin = document.getElementById('form-admin');
    const formInquilino = document.getElementById('form-inquilino');

    btnAdmin.addEventListener('click', () => {
        btnAdmin.classList.add('active');
        btnAdmin.setAttribute('aria-selected', 'true');
        btnInquilino.classList.remove('active');
        btnInquilino.setAttribute('aria-selected', 'false');
        formAdmin.classList.add('active');
        formInquilino.classList.remove('active');
    });

    btnInquilino.addEventListener('click', () => {
        btnInquilino.classList.add('active');
        btnInquilino.setAttribute('aria-selected', 'true');
        btnAdmin.classList.remove('active');
        btnAdmin.setAttribute('aria-selected', 'false');
        formInquilino.classList.add('active');
        formAdmin.classList.remove('active');
    });

    // 2. Envío de Formulario Administrador
    formAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuario = document.getElementById('admin-user').value.trim();
        const password = document.getElementById('admin-pass').value;
        const errorElement = document.getElementById('error-admin');
        errorElement.textContent = '';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'administrador', usuario, password })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('usuarioLogueado', data.user);
                localStorage.setItem('tipoUsuario', 'administrador');
                window.location.href = data.redirect;
            } else {
                errorElement.textContent = data.message;
            }
        } catch (error) {
            errorElement.textContent = 'Error al conectar con el servidor.';
            console.error(error);
        }
    });

    // 3. Envío de Formulario Inquilino (Validación estricta de DNI de 8 dígitos - WCAG 3.3.4)
    formInquilino.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dni = document.getElementById('inquilino-dni').value.trim();
        const errorElement = document.getElementById('error-inquilino');
        errorElement.textContent = '';

        if (!/^[0-9]{8}$/.test(dni)) {
            errorElement.textContent = 'Por favor, ingresa un número de DNI válido de exactamente 8 dígitos.';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'inquilino', usuario: dni })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('usuarioLogueado', data.user);
                localStorage.setItem('dniLogueado', dni);
                localStorage.setItem('tipoUsuario', 'inquilino');
                window.location.href = data.redirect;
            } else {
                errorElement.textContent = data.message;
            }
        } catch (error) {
            errorElement.textContent = 'Error al conectar con el servidor.';
            console.error(error);
        }
    });
});