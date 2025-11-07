/**
 * Script para inicializar un usuario administrador en la base de datos
 * 
 * Este script verifica si existe un usuario con rol de administrador
 * y crea uno si no existe ninguno
 */

require('dotenv').config({ path: '../.env' });
const { sequelize, connectDB } = require('../config/database');
const Usuario = require('../models/Usuario');
const Rol = require('../models/Rol');
const defineAssociations = require('../models/associations');

// Datos del administrador por defecto
const DEFAULT_ADMIN = {
    nombre: 'Admin',
    apellido: 'Sistema',
    email: 'admin@sistema.com',
    password: 'Admin123!',
};

/**
 * Inicializa un usuario administrador si no existe
 */
async function initAdminUser() {
    try {
        console.log('Conectando a la base de datos...');
        await connectDB();
        
        // Definir asociaciones antes de usarlas
        defineAssociations();
        
        // Buscar rol de administrador
        console.log('Buscando rol de administrador...');
        let adminRol = await Rol.findOne({ where: { nombre: 'admin' } });
        
        // Si no existe el rol admin, crearlo
        if (!adminRol) {
            console.log('Rol de administrador no encontrado, creando...');
            adminRol = await Rol.create({
                nombre: 'admin',
                descripcion: 'Administrador del sistema con acceso total'
            });
            console.log('Rol de administrador creado con ID:', adminRol.id);
        } else {
            console.log('Rol de administrador encontrado con ID:', adminRol.id);
        }
        
        // Verificar si existe algún usuario con rol admin
        const adminExists = await Usuario.findOne({
            where: { rolId: adminRol.id }
        });
        
        if (adminExists) {
            console.log('Ya existe un usuario administrador:', adminExists.email);
            return;
        }
        
        // Crear usuario administrador
        console.log('Creando usuario administrador por defecto...');
        const adminUser = await Usuario.create({
            nombre: DEFAULT_ADMIN.nombre,
            apellido: DEFAULT_ADMIN.apellido,
            email: DEFAULT_ADMIN.email,
            password: DEFAULT_ADMIN.password,
            rolId: adminRol.id,
            emailVerificado: true
        });
        
        console.log('✅ Usuario administrador creado exitosamente:');
        console.log(`   - Nombre: ${adminUser.nombre} ${adminUser.apellido}`);
        console.log(`   - Email: ${adminUser.email}`);
        console.log(`   - Contraseña: ${DEFAULT_ADMIN.password}`);
        console.log('\n⚠️ IMPORTANTE: Cambie la contraseña después del primer inicio de sesión');
        
    } catch (error) {
        console.error('❌ Error al inicializar usuario administrador:', error);
    } finally {
        // Cerrar conexión
        await sequelize.close();
        console.log('Conexión a la base de datos cerrada');
    }
}

// Ejecutar la función
initAdminUser();
