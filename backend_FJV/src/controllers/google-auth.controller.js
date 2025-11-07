/**
 * Controlador para la autenticación con Google OAuth2
 * Maneja callbacks y generación de tokens después de la autenticación
 */

const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/token');

const googleAuthController = {};

/**
 * Middleware para manejar el resultado de la autenticación con Google
 * Genera un token JWT y redirecciona al frontend con los datos
 */
googleAuthController.handleGoogleCallback = (req, res) => {
    try {
        // El usuario ya está autenticado y disponible en req.user gracias a Passport
        const user = req.user;
        
        if (!user) {
            return redirectToFrontendWithError(res, 'Autenticación fallida. Usuario no encontrado.');
        }
        
        // Generar token JWT
        const token = generateToken(user);
        
        // Preparar respuesta sin datos sensibles
        const userResponse = {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rolId: user.rolId,
            fotoPerfil: user.fotoPerfil,
            emailVerificado: user.emailVerificado,
            providerType: user.providerType
        };
        
        // Redireccionar al frontend con token y datos de usuario
        const frontendCallbackUrl = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4200/auth/callback';
        
        // Construir URL con parámetros (token y datos de usuario)
        const redirectUrl = new URL(frontendCallbackUrl);
        redirectUrl.searchParams.append('token', token);
        redirectUrl.searchParams.append('userData', encodeURIComponent(JSON.stringify(userResponse)));
        redirectUrl.searchParams.append('success', 'true');
        
        console.log('Redireccionando a frontend después de autenticación con Google exitosa:', user.email);
        return res.redirect(redirectUrl.toString());
        
    } catch (error) {
        console.error("Error en callback de Google:", error);
        return redirectToFrontendWithError(res, 'Error en el servidor durante la autenticación.');
    }
};

/**
 * Redirecciona al frontend con un mensaje de error
 */
function redirectToFrontendWithError(res, errorMessage) {
    const frontendCallbackUrl = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4200/auth/callback';
    const redirectUrl = new URL(frontendCallbackUrl);
    redirectUrl.searchParams.append('success', 'false');
    redirectUrl.searchParams.append('error', errorMessage);
    
    return res.redirect(redirectUrl.toString());
}

module.exports = googleAuthController;
