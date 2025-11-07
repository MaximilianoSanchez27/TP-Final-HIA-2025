/**
 * Utilidades para generación y manejo de tokens JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT para un usuario
 */
const generateToken = (user, expiresIn = '24h') => {
    const payload = {
        id: user.id,
        email: user.email,
        rolId: user.rolId,
        nombre: user.nombre
    };
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'tu_clave_secreta_jwt',
        { expiresIn }
    );
};

/**
 * Verifica y decodifica un token JWT
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_jwt');
    } catch (error) {
        console.error('Error al verificar token:', error.message);
        return null;
    }
};

/**
 * Extrae token de los headers de una solicitud
 */
const extractTokenFromHeader = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.slice(7);
    }
    return null;
};

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeader
};
