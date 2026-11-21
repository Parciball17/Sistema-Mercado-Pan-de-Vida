const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos un "pool" de conexiones para manejar múltiples peticiones simultáneas
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Prueba de conexión al iniciar
pool.getConnection()
    .then(connection => {
        console.log('✅ Conectado a la base de datos MySQL: mercado_pan_de_vida');
        connection.release(); // Liberamos la conexión de prueba
    })
    .catch(err => {
        console.error('❌ Error al conectar a la base de datos:', err);
    });

module.exports = pool;