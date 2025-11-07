/**
 * Rutas para autenticación 
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authCtrl = require('../controllers/auth.controller');
const googleAuthCtrl = require('../controllers/google-auth.controller');
const linkedinAuthCtrl = require('../controllers/linkedin-auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Función reutilizable para manejar callbacks de autenticación social
const handleSocialAuthCallback = (strategyName, errorRedirect) => {
    return (req, res, next) => {
        console.log(`Procesando callback de ${strategyName}...`);
        passport.authenticate(strategyName, { 
            session: true,
            failureRedirect: errorRedirect
        }, (err, user, info) => {
            if (err || !user) {
                const errorMsg = err?.message || 'Error de autenticación';
                console.error(`Error en autenticación ${strategyName}:`, errorMsg);
                
                const frontendCallbackUrl = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4200/auth/callback';
                const redirectUrl = new URL(frontendCallbackUrl);
                redirectUrl.searchParams.append('success', 'false');
                redirectUrl.searchParams.append('error', errorMsg);
                
                return res.redirect(redirectUrl.toString());
            }
            
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error(`Error al guardar sesión ${strategyName}:`, loginErr);
                    const frontendCallbackUrl = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4200/auth/callback';
                    const redirectUrl = new URL(frontendCallbackUrl);
                    redirectUrl.searchParams.append('success', 'false');
                    redirectUrl.searchParams.append('error', loginErr.message);
                    
                    return res.redirect(redirectUrl.toString());
                }
                console.log(`Usuario autenticado exitosamente con ${strategyName}: ${user.email}`);
                next();
            });
        })(req, res, next);
    };
};

//------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN TRADICIONAL
//------------------------------------------------------------

// Iniciar sesión con email y contraseña
router.post('/login', authCtrl.login);

// Validar token JWT
router.get('/validate-token', authenticate, authCtrl.validateToken);

// Añadir ruta para verificar token sin devolver datos de usuario
router.get('/check-token', authenticate, authCtrl.checkToken);

// Ruta protegida de ejemplo - solo accesible por administradores
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
    res.json({ 
        success: true,
        message: 'Tienes acceso como administrador',
        user: {
            id: req.user.id,
            nombre: req.user.nombre,
            rol: req.user.rol?.nombre
        }
    });
});

//------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN CON GOOGLE
//------------------------------------------------------------

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback después de autenticación con Google
router.get('/google/callback', 
    handleSocialAuthCallback('google', '/api/auth/login-error'),
    googleAuthCtrl.handleGoogleCallback
);

//------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN CON LINKEDIN
//------------------------------------------------------------

// Iniciar el flujo de autenticación con LinkedIn
router.get('/linkedin', (req, res, next) => {
    console.log('Iniciando autenticación con LinkedIn...');
    passport.authenticate('linkedin', {
        scope: ['openid', 'profile', 'email']
    })(req, res, next);
});

// Callback después de autenticación con LinkedIn
router.get('/linkedin/callback', (req, res, next) => {
    console.log('Recibido callback de LinkedIn con parámetros:', {
        code: req.query.code ? 'PRESENTE' : 'AUSENTE',
        state: req.query.state || 'NO PRESENTE',
        error: req.query.error || 'NINGUNO'
    });
    
    if (req.query.error) {
        console.error('Error en callback de LinkedIn:', req.query.error, req.query.error_description);
        const frontendCallbackUrl = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:4200/auth/callback';
        const redirectUrl = new URL(frontendCallbackUrl);
        redirectUrl.searchParams.append('success', 'false');
        redirectUrl.searchParams.append('error', req.query.error_description || req.query.error);
        
        return res.redirect(redirectUrl.toString());
    }
    
    handleSocialAuthCallback('linkedin', '/api/auth/login-error')(req, res, next);
}, linkedinAuthCtrl.handleLinkedInCallback);

//------------------------------------------------------------
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
//------------------------------------------------------------

router.get('/status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.user ? {
            id: req.user.id,
            email: req.user.email,
            nombre: req.user.nombre,
            apellido: req.user.apellido,
            rol: req.user.rolId
        } : null
    });
});

//------------------------------------------------------------
// MANEJO DE ERRORES DE AUTENTICACIÓN
//------------------------------------------------------------

router.get('/login-error', (req, res) => {
    const errorMessage = req.query.error || 'Error de autenticación';
    res.status(401).json({
        success: false,
        message: "Error de autenticación",
        details: errorMessage
    });
});

module.exports = router;
