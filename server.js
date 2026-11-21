const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db'); // Importamos la conexión a la base de datos

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Permite leer datos enviados en formato JSON
app.use(express.urlencoded({ extended: true }));

// Configurar Express para servir los archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// RUTAS DE LA API (Backend)
// ==========================================

// 1. Ruta para el Login (Administrador e Inquilino)
app.post('/api/login', async (req, res) => {
    const { usuario, password, tipo } = req.body;

    try {
        if (tipo === 'administrador') {
            const [rows] = await db.query(
                'SELECT * FROM administradores WHERE usuario = ? AND password = ?',
                [usuario, password]
            );

            if (rows.length > 0) {
                res.json({ success: true, redirect: '/principal_admin.html', user: rows[0].usuario });
            } else {
                res.status(401).json({ success: false, message: 'Usuario o contraseña de administrador incorrectos.' });
            }

        } else if (tipo === 'inquilino') {
            const [rows] = await db.query(
                'SELECT * FROM inquilinos WHERE dni = ?',
                [usuario]
            );

            if (rows.length > 0) {
                res.json({ success: true, redirect: '/principal_cliente.html', user: rows[0].nombres });
            } else {
                res.status(401).json({ success: false, message: 'DNI no encontrado. No está registrado en el mercado.' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Tipo de usuario no válido.' });
        }
    } catch (error) {
        console.error('Error en el proceso de login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// 2. Ruta para el Dashboard Principal (Administrador)
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // 1. Puestos Ocupados
        const [ocupados] = await db.query("SELECT COUNT(*) as count FROM puestos WHERE estado != 'Libre'");

        // 2. Ingresos del mes actual
        const [ingresos] = await db.query(`
            SELECT SUM(monto) as total FROM transacciones 
            WHERE tipo_transaccion = 'Ingreso' 
            AND MONTH(fecha_pago) = MONTH(CURRENT_DATE()) 
            AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
        `);

        // 3. Pagos Pendientes del mes actual
        const [pendientes] = await db.query(`
            SELECT COUNT(*) as count FROM deudas 
            WHERE estado = 'Pendiente' AND MONTH(fecha_emision) = MONTH(CURRENT_DATE())
        `);

        // 4. Obtener todos los puestos y calcular su color
        const [puestos] = await db.query(`
            SELECT p.codigo, p.estado as estado_fisico, p.tipo_puesto, i.dni, i.nombres
            FROM puestos p
            LEFT JOIN inquilinos i ON p.inquilino_dni = i.dni
        `);

        const [deudas] = await db.query("SELECT puesto_codigo, estado FROM deudas WHERE estado IN ('Vencido', 'Pendiente')");

        const grid = puestos.map(p => {
            let color = 'blanco'; // Libre
            if (p.estado_fisico === 'Bloqueado') {
                color = 'gris';
            } else if (p.estado_fisico === 'En Uso') {
                const deudasPuesto = deudas.filter(d => d.puesto_codigo === p.codigo);
                if (deudasPuesto.some(d => d.estado === 'Vencido')) {
                    color = 'rojo'; // Atrasado
                } else if (deudasPuesto.some(d => d.estado === 'Pendiente')) {
                    color = 'amarillo'; // Pendiente
                } else {
                    color = 'verde'; // Al día
                }
            }
            return { ...p, color };
        });

        const alDiaCount = grid.filter(p => p.color === 'verde').length;
        const ocupadosCount = ocupados[0].count;

        // 5. Últimos 10 pagos realizados
        const [ultimosPagos] = await db.query(`
            SELECT CONCAT(i.nombres, ' ', i.apellidos) as nombre, i.tipo, i.dni, 
                   DATE_FORMAT(t.fecha_pago, '%d/%m/%Y') as fecha, t.monto as pago, i.saldo
            FROM transacciones t
            JOIN inquilinos i ON t.inquilino_dni = i.dni
            WHERE t.tipo_transaccion = 'Ingreso'
            ORDER BY t.fecha_pago DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            stats: {
                ocupados: `${ocupadosCount}/100`,
                ingresos: `S/. ${ingresos[0].total || 0}`,
                alDia: `${alDiaCount}/${ocupadosCount}`,
                pendientes: pendientes[0].count
            },
            grid,
            pagos: ultimosPagos
        });

    } catch (error) {
        console.error('Error en el dashboard:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// 3. Ruta para obtener la lista de Inquilinos
app.get('/api/admin/inquilinos', async (req, res) => {
    try {
        const query = `
            SELECT 
                i.dni, 
                CONCAT(i.nombres, ' ', i.apellidos) AS nombre, 
                i.tipo, 
                i.estado, 
                p.codigo AS puesto,
                (SELECT SUM(monto) FROM deudas d WHERE d.inquilino_dni = i.dni AND d.estado IN ('Vencido', 'Pendiente')) AS deuda_activa,
                (SELECT COUNT(*) FROM deudas d2 WHERE d2.inquilino_dni = i.dni AND d2.estado = 'Vencido') AS deudas_vencidas,
                (SELECT COUNT(*) FROM deudas d3 WHERE d3.inquilino_dni = i.dni AND d3.estado = 'Pendiente') AS deudas_pendientes
            FROM inquilinos i
            LEFT JOIN puestos p ON i.dni = p.inquilino_dni
        `;
        const [rows] = await db.query(query);

        const inquilinos = rows.map(row => {
            let estado_pago = 'Al Día';
            if (row.deudas_vencidas > 0) estado_pago = 'Atrasado';
            else if (row.deudas_pendientes > 0) estado_pago = 'Pendiente';

            return {
                nombre: row.nombre,
                tipo: row.tipo,
                estado: row.estado,
                dni: row.dni,
                puesto: row.puesto || '-',
                estado_pago,
                deuda_activa: row.deuda_activa || 0
            };
        });

        res.json({ success: true, inquilinos });
    } catch (error) {
        console.error('Error al cargar inquilinos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// 4. Ruta para obtener puestos libres (para el formulario de registro de inquilino)
app.get('/api/admin/puestos_libres', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT codigo, tipo_puesto, precio_alquiler
            FROM puestos
            WHERE estado = 'Libre' AND inquilino_dni IS NULL
            ORDER BY codigo ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener puestos libres:', error);
        res.status(500).json({ success: false, message: 'Error al consultar puestos libres.' });
    }
});

// 5. Ruta para registrar un nuevo inquilino (con asignación opcional de puesto libre)
app.post('/api/admin/registrar_inquilino', async (req, res) => {
    const { dni, nombres, apellidos, celular, direccion, puesto_codigo, fecha_inicio } = req.body;

    if (!dni || !/^[0-9]{8,15}$/.test(String(dni).trim())) {
        return res.status(400).json({
            success: false,
            message: 'El DNI debe tener entre 8 y 15 dígitos numéricos.'
        });
    }

    if (!nombres || !apellidos || !nombres.trim() || !apellidos.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Los campos Nombres y Apellidos son obligatorios.'
        });
    }

    try {
        const dniLimpio = String(dni).trim();

        // 1. Verificar si el DNI ya existe
        const [existente] = await db.query('SELECT dni FROM inquilinos WHERE dni = ?', [dniLimpio]);
        if (existente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El DNI ingresado ya se encuentra registrado en el sistema.'
            });
        }

        // 2. Si seleccionó un puesto, verificar que siga disponible
        if (puesto_codigo) {
            const [puesto] = await db.query(
                "SELECT codigo FROM puestos WHERE codigo = ? AND estado = 'Libre' AND inquilino_dni IS NULL",
                [puesto_codigo]
            );
            if (puesto.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `El puesto ${puesto_codigo} ya no se encuentra disponible.`
                });
            }
        }

        const estadoInicial = puesto_codigo ? 'Activo' : 'Inactivo';

        // 3. Insertar inquilino
        await db.query(`
            INSERT INTO inquilinos (dni, nombres, apellidos, celular, direccion, tipo, estado, saldo)
            VALUES (?, ?, ?, ?, ?, 'Inquilino', ?, 0.00)
        `, [
            dniLimpio,
            nombres.trim(),
            apellidos.trim(),
            celular ? String(celular).trim() : null,
            direccion ? direccion.trim() : null,
            estadoInicial
        ]);

        // 4. Vincular puesto si se seleccionó uno
        if (puesto_codigo) {
            const fechaBase = fecha_inicio || new Date().toISOString().split('T')[0];
            await db.query(`
                UPDATE puestos
                SET estado = 'En Uso',
                    inquilino_dni = ?,
                    fecha_inicio = ?,
                    fecha_vencimiento = DATE_ADD(?, INTERVAL 1 MONTH)
                WHERE codigo = ?
            `, [dniLimpio, fechaBase, fechaBase, puesto_codigo]);
        }

        res.json({
            success: true,
            message: puesto_codigo
                ? `Inquilino registrado y asignado al puesto ${puesto_codigo}.`
                : 'Inquilino registrado exitosamente (Estado: Inactivo).'
        });
    } catch (error) {
        console.error('Error al registrar inquilino:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al registrar.' });
    }
});

// 6. Ruta para borrar un inquilino (Requiere Contraseña)
app.post('/api/admin/borrar_inquilino', async (req, res) => {
    const { dni, password } = req.body;
    try {
        const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Contraseña de administrador incorrecta.' });
        }

        // Liberar el puesto si el inquilino tenía uno asignado
        await db.query(`
            UPDATE puestos
            SET estado = 'Libre', inquilino_dni = NULL, fecha_inicio = NULL, fecha_vencimiento = NULL
            WHERE inquilino_dni = ?
        `, [dni]);

        await db.query('DELETE FROM inquilinos WHERE dni = ?', [dni]);
        res.json({ success: true, message: 'Inquilino eliminado correctamente.' });

    } catch (error) {
        console.error('Error al borrar inquilino:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==========================================
// RUTAS: PERFIL DE INQUILINO
// ==========================================

// 1. Obtener toda la info del Inquilino (Datos, Deudas y Pagos)
app.get('/api/admin/inquilino/:dni', async (req, res) => {
    const { dni } = req.params;
    try {
        const [info] = await db.query(`
            SELECT i.*, p.codigo as puesto 
            FROM inquilinos i 
            LEFT JOIN puestos p ON i.dni = p.inquilino_dni 
            WHERE i.dni = ?
        `, [dni]);

        if (info.length === 0) return res.status(404).json({ success: false, message: 'Inquilino no encontrado' });

        const [deudas] = await db.query(`
            SELECT * FROM deudas 
            WHERE inquilino_dni = ? AND estado IN ('Pendiente', 'Vencido')
            ORDER BY fecha_emision ASC
        `, [dni]);

        const [pagos] = await db.query(`
            SELECT * FROM transacciones 
            WHERE inquilino_dni = ? AND tipo_transaccion = 'Ingreso'
            ORDER BY fecha_pago DESC
        `, [dni]);

        res.json({ success: true, info: info[0], deudas, pagos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener perfil' });
    }
});

// 2. Modificar Saldo del Inquilino
app.post('/api/admin/modificar_saldo', async (req, res) => {
    const { dni, nuevoSaldo, password } = req.body;
    try {
        const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
        if (admins.length === 0) return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });

        await db.query('UPDATE inquilinos SET saldo = ? WHERE dni = ?', [nuevoSaldo, dni]);
        res.json({ success: true, message: 'Saldo actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar saldo' });
    }
});

// 3. Pagar Deuda (Lógica inteligente con Saldo)
app.post('/api/admin/pagar_deuda', async (req, res) => {
    const { id_deuda, dni } = req.body;
    try {
        const [deuda] = await db.query('SELECT monto, tipo, puesto_codigo FROM deudas WHERE id = ?', [id_deuda]);
        const [inquilino] = await db.query('SELECT saldo FROM inquilinos WHERE dni = ?', [dni]);

        if (deuda.length === 0 || inquilino.length === 0) return res.status(404).json({ success: false });

        const montoDeuda = parseFloat(deuda[0].monto);
        let saldoActual = parseFloat(inquilino[0].saldo);

        if (saldoActual <= 0) return res.json({ success: false, message: 'Sin fondos. Recargue el saldo del inquilino.' });

        let montoAPagar = 0;
        let deudaRestante = 0;
        let estadoNuevo = 'Pendiente';

        if (saldoActual >= montoDeuda) {
            montoAPagar = montoDeuda;
            saldoActual -= montoDeuda;
            estadoNuevo = 'Pagado';
        } else {
            montoAPagar = saldoActual;
            deudaRestante = montoDeuda - saldoActual;
            saldoActual = 0;
            estadoNuevo = 'Pendiente';
        }

        await db.query('UPDATE inquilinos SET saldo = ? WHERE dni = ?', [saldoActual, dni]);

        if (estadoNuevo === 'Pagado') {
            await db.query('UPDATE deudas SET estado = "Pagado" WHERE id = ?', [id_deuda]);
        } else {
            await db.query('UPDATE deudas SET monto = ? WHERE id = ?', [deudaRestante, id_deuda]);
        }

        await db.query(`
            INSERT INTO transacciones (tipo_transaccion, detalle, inquilino_dni, puesto_codigo, monto, fecha_pago)
            VALUES ('Ingreso', ?, ?, ?, ?, CURRENT_DATE())
        `, [deuda[0].tipo, dni, deuda[0].puesto_codigo, montoAPagar]);

        res.json({
            success: true,
            message: estadoNuevo === 'Pagado' ? 'Deuda pagada completamente.' : 'Pago parcial realizado. Saldo agotado.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// 4. Borrar Deuda (Con validación de contraseña de Administrador - WCAG 3.3.4)
app.post('/api/admin/borrar_deuda', async (req, res) => {
    const { id_deuda, password } = req.body;
    try {
        if (password !== undefined) {
            const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
            if (admins.length === 0) {
                return res.status(401).json({ success: false, message: 'Contraseña de administrador incorrecta.' });
            }
        }
        await db.query('DELETE FROM deudas WHERE id = ?', [id_deuda]);
        res.json({ success: true, message: 'Deuda eliminada correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// ==========================================
// RUTAS: GESTIÓN DE PUESTOS
// ==========================================

// 1. Obtener la lista general de Puestos
app.get('/api/admin/puestos', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.codigo, 
                p.tipo_puesto, 
                p.estado AS estado_fisico, 
                i.dni AS inquilino_dni,
                CONCAT(i.nombres, ' ', i.apellidos) AS nombre_inquilino,
                (SELECT SUM(monto) FROM deudas d WHERE d.puesto_codigo = p.codigo AND d.estado IN ('Vencido', 'Pendiente')) AS deuda_total_puesto,
                (SELECT COUNT(*) FROM deudas d2 WHERE d2.puesto_codigo = p.codigo AND d2.estado = 'Vencido') AS deudas_vencidas,
                (SELECT COUNT(*) FROM deudas d3 WHERE d3.puesto_codigo = p.codigo AND d3.estado = 'Pendiente') AS deudas_pendientes
            FROM puestos p
            LEFT JOIN inquilinos i ON p.inquilino_dni = i.dni
        `;
        const [rows] = await db.query(query);

        const puestos = rows.map(row => {
            let estado_pago = '-';
            if (row.estado_fisico === 'En Uso' || row.estado_fisico === 'Bloqueado') {
                if (row.deudas_vencidas > 0) estado_pago = 'Atrasado';
                else if (row.deudas_pendientes > 0) estado_pago = 'Pendiente';
                else estado_pago = 'Al Día';
            }

            return {
                codigo: row.codigo,
                tipo: row.tipo_puesto,
                estado_fisico: row.estado_fisico,
                estado_pago,
                inquilino: row.nombre_inquilino || 'Sin asignar',
                dni_inquilino: row.inquilino_dni,
                deuda: row.deuda_total_puesto || 0
            };
        });

        res.json({ success: true, puestos });
    } catch (error) {
        console.error('Error al cargar puestos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==========================================
// RUTAS: PERFIL DE PUESTO
// ==========================================

// 1. Obtener información completa del puesto
app.get('/api/admin/puesto/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const [puestoInfo] = await db.query(`
            SELECT p.*, i.nombres, i.apellidos, i.estado as estado_inquilino
            FROM puestos p
            LEFT JOIN inquilinos i ON p.inquilino_dni = i.dni
            WHERE p.codigo = ?
        `, [codigo]);

        if (puestoInfo.length === 0) return res.status(404).json({ success: false });

        let deudas = [];
        if (puestoInfo[0].inquilino_dni) {
            [deudas] = await db.query(`
                SELECT * FROM deudas 
                WHERE puesto_codigo = ? AND inquilino_dni = ? AND estado IN ('Pendiente', 'Vencido')
            `, [codigo, puestoInfo[0].inquilino_dni]);
        }

        res.json({ success: true, info: puestoInfo[0], deudas });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// 2. Modificar un precio base del puesto
app.post('/api/admin/modificar_precio_puesto', async (req, res) => {
    const { codigo, columna, nuevoPrecio, password } = req.body;
    try {
        const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
        if (admins.length === 0) return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });

        const columnasPermitidas = ['precio_alquiler', 'precio_luz', 'precio_agua', 'precio_mantenimiento', 'precio_vigilancia'];
        if (!columnasPermitidas.includes(columna)) return res.status(400).json({ success: false });

        await db.query(`UPDATE puestos SET ${columna} = ? WHERE codigo = ?`, [nuevoPrecio, codigo]);
        res.json({ success: true, message: 'Precio actualizado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 3. Inhabilitar / Habilitar Puesto
app.post('/api/admin/toggle_estado_puesto', async (req, res) => {
    const { codigo, estadoActual } = req.body;
    try {
        const nuevoEstado = estadoActual === 'Bloqueado' ? 'En Uso' : 'Bloqueado';
        await db.query('UPDATE puestos SET estado = ? WHERE codigo = ?', [nuevoEstado, codigo]);
        res.json({ success: true, nuevoEstado, message: `Puesto marcado como ${nuevoEstado}` });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 4. Dar de Baja al Inquilino (Con validación de contraseña de Administrador - WCAG 3.3.4)
app.post('/api/admin/dar_baja_inquilino', async (req, res) => {
    const { codigo, dni, password } = req.body;
    try {
        if (password !== undefined) {
            const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
            if (admins.length === 0) {
                return res.status(401).json({ success: false, message: 'Contraseña de administrador incorrecta.' });
            }
        }
        const [deudas] = await db.query('SELECT SUM(monto) as total FROM deudas WHERE inquilino_dni = ? AND estado IN ("Pendiente", "Vencido")', [dni]);
        const tieneDeuda = (deudas[0].total || 0) > 0;

        const nuevoTipo = tieneDeuda ? 'Deudor' : 'Inquilino';
        await db.query('UPDATE inquilinos SET estado = "Inactivo", tipo = ? WHERE dni = ?', [nuevoTipo, dni]);
        await db.query('UPDATE puestos SET estado = "Libre", inquilino_dni = NULL, fecha_inicio = NULL, fecha_vencimiento = NULL WHERE codigo = ?', [codigo]);

        res.json({ success: true, message: 'Inquilino dado de baja y puesto liberado exitosamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al dar de baja al inquilino.' });
    }
});

// 5. Agregar Deuda Manual
app.post('/api/admin/agregar_deuda', async (req, res) => {
    const { dni, puesto, tipo, monto } = req.body;
    try {
        const tiposPermitidos = ['Alquiler', 'Luz', 'Agua', 'Mantenimiento', 'Vigilancia', 'Multa', 'Otro'];
        const tipoValido = tiposPermitidos.find(t => t.toLowerCase() === String(tipo || '').trim().toLowerCase()) || 'Otro';

        await db.query(`
            INSERT INTO deudas (inquilino_dni, puesto_codigo, tipo, estado, monto, fecha_emision)
            VALUES (?, ?, ?, 'Vencido', ?, CURRENT_DATE())
        `, [dni, puesto, tipoValido, monto]);
        res.json({ success: true, message: 'Deuda agregada exitosamente.' });
    } catch (error) {
        console.error('Error al agregar deuda:', error);
        res.status(500).json({ success: false, message: 'Error al agregar deuda.' });
    }
});

// 6. Obtener inquilinos disponibles (Inactivos y sin estado Deudor) para asignar a un puesto
app.get('/api/admin/inquilinos_disponibles', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT i.dni, i.nombres, i.apellidos
            FROM inquilinos i
            LEFT JOIN puestos p ON i.dni = p.inquilino_dni
            WHERE i.estado = 'Inactivo'
              AND i.tipo = 'Inquilino'
              AND p.codigo IS NULL
            ORDER BY i.nombres ASC, i.apellidos ASC
        `);
        res.json({ success: true, inquilinos: rows });
    } catch (error) {
        console.error('Error al listar inquilinos disponibles:', error);
        res.status(500).json({ success: false, message: 'Error al consultar inquilinos disponibles.' });
    }
});

// 7. Asignar un inquilino existente a un puesto Libre
app.post('/api/admin/asignar_inquilino_puesto', async (req, res) => {
    const { codigo, dni, fecha_inicio } = req.body;

    if (!codigo || !dni) {
        return res.status(400).json({ success: false, message: 'Faltan el código de puesto o el DNI del inquilino.' });
    }

    try {
        // Verificar que el puesto siga Libre
        const [puesto] = await db.query(
            "SELECT codigo FROM puestos WHERE codigo = ? AND estado = 'Libre' AND inquilino_dni IS NULL",
            [codigo]
        );
        if (puesto.length === 0) {
            return res.status(400).json({ success: false, message: `El puesto ${codigo} ya no está disponible.` });
        }

        // Verificar que el inquilino exista y no sea Deudor
        const [inquilino] = await db.query(
            'SELECT dni, tipo, estado FROM inquilinos WHERE dni = ?',
            [dni]
        );
        if (inquilino.length === 0) {
            return res.status(404).json({ success: false, message: 'Inquilino no encontrado.' });
        }
        if (inquilino[0].tipo === 'Deudor') {
            return res.status(400).json({
                success: false,
                message: 'No se puede asignar un puesto a un inquilino con categoría Deudor hasta que cancele sus deudas.'
            });
        }

        const fechaBase = fecha_inicio || new Date().toISOString().split('T')[0];

        // 1. Actualizar puesto a 'En Uso'
        await db.query(`
            UPDATE puestos
            SET estado = 'En Uso',
                inquilino_dni = ?,
                fecha_inicio = ?,
                fecha_vencimiento = DATE_ADD(?, INTERVAL 1 MONTH)
            WHERE codigo = ?
        `, [dni, fechaBase, fechaBase, codigo]);

        // 2. Actualizar estado del inquilino a 'Activo'
        await db.query("UPDATE inquilinos SET estado = 'Activo' WHERE dni = ?", [dni]);

        res.json({ success: true, message: `Inquilino asignado exitosamente al puesto ${codigo}.` });
    } catch (error) {
        console.error('Error al asignar inquilino al puesto:', error);
        res.status(500).json({ success: false, message: 'Error interno al asignar el puesto.' });
    }
});

// ==========================================
// RUTAS: INGRESOS Y EGRESOS
// ==========================================

// 1. Obtener Transacciones (General o por Periodo)
app.get('/api/admin/transacciones', async (req, res) => {
    const { inicio, fin } = req.query;
    try {
        let query = `
            SELECT t.id, t.tipo_transaccion as tipo, 
                   COALESCE(CONCAT(i.nombres, ' ', i.apellidos), t.entidad_externa, 'Desconocido') as usuario,
                   t.detalle, t.fecha_pago, t.monto, i.dni
            FROM transacciones t
            LEFT JOIN inquilinos i ON t.inquilino_dni = i.dni
        `;
        const params = [];

        if (inicio && fin) {
            query += ` WHERE t.fecha_pago >= ? AND t.fecha_pago <= ? `;
            params.push(inicio, fin);
        }

        query += ` ORDER BY t.fecha_pago DESC`;

        const [rows] = await db.query(query, params);
        res.json({ success: true, transacciones: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// 2. Agregar Egreso / Ingreso Manual
app.post('/api/admin/agregar_transaccion', async (req, res) => {
    const { tipo, detalle, usuario, monto, fecha } = req.body;
    try {
        await db.query(`
            INSERT INTO transacciones (tipo_transaccion, detalle, entidad_externa, monto, fecha_pago)
            VALUES (?, ?, ?, ?, ?)
        `, [tipo, detalle, usuario, monto, fecha]);
        res.json({ success: true, message: 'Transacción guardada exitosamente.' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 3. Borrar Transacción (Requiere Contraseña)
app.post('/api/admin/borrar_transaccion', async (req, res) => {
    const { id, password } = req.body;
    try {
        const [admins] = await db.query('SELECT * FROM administradores WHERE password = ?', [password]);
        if (admins.length === 0) return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });

        await db.query('DELETE FROM transacciones WHERE id = ?', [id]);
        res.json({ success: true, message: 'Transacción eliminada.' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Mercado Pan de Vida corriendo en http://localhost:${PORT}`);
});