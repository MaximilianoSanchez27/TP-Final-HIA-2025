const { Sequelize } = require('sequelize');
require('dotenv').config(); // Cargar variables de entorno automáticamente

// Configuración de la conexión a PostgreSQL usando solo variables de entorno
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT,
        logging: process.env.DB_LOGGING === 'true'
    }
);

// Función para probar la conexión a la base de datos
async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos PostgreSQL establecida exitosamente.');
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
    }
}

// Exportamos la instancia de sequelize y la función de conexión
module.exports = {
    sequelize,
    connectDB
};