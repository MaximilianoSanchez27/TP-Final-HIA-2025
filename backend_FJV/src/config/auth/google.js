/**
 * Estrategia de autenticación con Google OAuth2
 */

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../../models/Usuario');
const Rol = require('../../models/Rol');

/**
 * Configura la estrategia de autenticación de Google
 */
module.exports = (passport) => {
    // Solo configurar si existen credenciales de Google
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ Credenciales de Google OAuth no configuradas');
        return;
    }
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            console.log('Procesando autenticación con Google:', profile.displayName);
            
            // Extraer email del perfil de Google
            const email = profile.emails?.[0]?.value;
            
            if (!email) {
                console.error('No se pudo obtener el email del usuario desde Google');
                return done(new Error('No se pudo obtener el email de la cuenta de Google'), false);
            }
            
            // MODIFICACIÓN: Buscar si el usuario ya existe por email
            const usuarioExistente = await Usuario.findOne({ where: { email } });
            
            // Si el usuario no existe en la base de datos, rechazar la autenticación
            if (!usuarioExistente) {
                console.error(`Usuario con email ${email} no existe en la base de datos`);
                return done(new Error('Usuario no encontrado'), false);
            }
            
            // Si el usuario existe pero no tiene googleId, actualizarlo
            if (!usuarioExistente.googleId) {
                console.log(`Actualizando googleId para usuario existente: ${email}`);
                usuarioExistente.googleId = profile.id;
                usuarioExistente.providerType = 'google';
                
                // Si el usuario no tiene foto de perfil, usar la de Google
                if (!usuarioExistente.fotoPerfil && profile.photos?.[0]?.value) {
                    usuarioExistente.fotoPerfil = profile.photos[0].value;
                }
                
                await usuarioExistente.save();
            }
            
            // Autenticación exitosa
            return done(null, usuarioExistente);
            
        } catch (error) {
            console.error('Error durante autenticación con Google:', error);
            return done(error, false);
        }
    }));
};
