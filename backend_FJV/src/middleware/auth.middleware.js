/**
 * Middleware de autenticación y autorización
 * 
 * Este archivo contiene middlewares para verificar tokens JWT
 * y proteger rutas según permisos de usuario
 */

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

/**
 * Middleware para verificar token JWT
 * Verifica que el usuario esté autenticado y añade el usuario a req.user
 */
const authenticate = async (req, res, next) => {
    try {
        // Extraer token del encabezado Authorization
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. Token no proporcionado'
            });
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_jwt');
        
        // Buscar usuario por ID desde el token
        const usuario = await Usuario.findByPk(decoded.id, {
            include: ['rol'] // Incluir información del rol
        });

        // Verificar si el usuario existe
        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Añadir usuario a la solicitud
        req.user = usuario;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado. Por favor inicie sesión nuevamente'
            });
        }
        
        res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

/**
 * Middleware para verificar roles
 * Se usa después de authenticate para verificar permisos
 */
const authorize = (roles) => {
    // Convertir a array si se proporciona un solo rol
    if (typeof roles === 'string') {
        roles = [roles];
    }
    
    return (req, res, next) => {
        // authenticate debe ejecutarse primero
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }
        
        // Verificar si el rol del usuario está en la lista de roles permitidos
        if (roles.length && !roles.includes(req.user.rol?.nombre)) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para acceder a este recurso'
            });
        }
        
        next();
    };
};

/**
 * Middleware de autenticación opcional
 * Si hay token lo verifica, si no, continúa sin usuario
 */
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            // No hay token, continuar sin usuario
            req.user = null;
            return next();
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_jwt');
        
        // Buscar usuario por ID desde el token
        const usuario = await Usuario.findByPk(decoded.id, {
            include: ['rol']
        });

        // Si el usuario existe, añadirlo a la solicitud
        req.user = usuario || null;
        next();
    } catch (error) {
        // Si hay error en el token, continuar sin usuario
        req.user = null;
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuthenticate
};
