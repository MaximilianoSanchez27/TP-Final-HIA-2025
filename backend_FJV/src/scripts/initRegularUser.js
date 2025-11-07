/**
 * Script para inicializar un usuario regular en la base de datos
 * 
 * Este script crea un usuario con rol "usuario" (id=2) solicitando
 * los datos a través de la línea de comandos
 */

require('dotenv').config({ path: '../.env' });
const { sequelize, connectDB } = require('../config/database');
const Usuario = require('../models/Usuario');
const Rol = require('../models/Rol');
const defineAssociations = require('../models/associations');
const readline = require('readline');

// Crear interfaz para leer entrada del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para preguntar datos al usuario
function pregunta(pregunta) {
    return new Promise((resolve) => {
        rl.question(pregunta, (respuesta) => {
            resolve(respuesta.trim());
        });
    });
}

/**
 * Inicializa un usuario regular solicitando datos por consola
 */
async function initRegularUser() {
    try {
        console.log('Conectando a la base de datos...');
        await connectDB();
        
        // Definir asociaciones antes de usarlas
        defineAssociations();
        
        // Buscar rol de usuario
        console.log('Buscando rol de usuario regular...');
        let userRol = await Rol.findOne({ where: { nombre: 'usuario' } });
        
        // Si no existe el rol usuario, crearlo
        if (!userRol) {
            console.log('Rol de usuario no encontrado, creando...');
            userRol = await Rol.create({
                nombre: 'usuario',
                descripcion: 'Usuario regular del sistema'
            });
            console.log('Rol de usuario creado con ID:', userRol.id);
        } else {
            console.log('Rol de usuario encontrado con ID:', userRol.id);
        }
        
        // Solicitar datos del usuario
        console.log('\n=== CREACIÓN DE NUEVO USUARIO REGULAR ===');
        const nombre = await pregunta('Ingrese nombre: ');
        const apellido = await pregunta('Ingrese apellido: ');
        const email = await pregunta('Ingrese email: ');
        
        // Verificar que el email no exista
        const emailExiste = await Usuario.findOne({ where: { email } });
        if (emailExiste) {
            console.error(`❌ Error: Ya existe un usuario con el email '${email}'`);
            rl.close();
            await sequelize.close();
            return;
        }
        
        // Solicitar contraseña con confirmación
        let password = '';
        let confirmPassword = '';
        do {
            password = await pregunta('Ingrese contraseña: ');
            confirmPassword = await pregunta('Confirme contraseña: ');
            
            if (password !== confirmPassword) {
                console.log('Las contraseñas no coinciden. Intente nuevamente.');
            }
            
            if (password.length < 6) {
                console.log('La contraseña debe tener al menos 6 caracteres. Intente nuevamente.');
                password = '';
            }
            
        } while (password !== confirmPassword || password.length < 6);
        
        // Crear usuario regular
        console.log('\nCreando usuario regular...');
        const regularUser = await Usuario.create({
            nombre,
            apellido,
            email,
            password,
            rolId: userRol.id,
            emailVerificado: true
        });
        
        console.log('\n✅ Usuario regular creado exitosamente:');
        console.log(`   - Nombre: ${regularUser.nombre} ${regularUser.apellido}`);
        console.log(`   - Email: ${regularUser.email}`);
        
        // Cerrar la interfaz de readline
        rl.close();
        
    } catch (error) {
        console.error('\n❌ Error al inicializar usuario regular:', error);
        rl.close();
    } finally {
        // Cerrar conexión
        await sequelize.close();
        console.log('Conexión a la base de datos cerrada');
    }
}

// Ejecutar la función
initRegularUser();
