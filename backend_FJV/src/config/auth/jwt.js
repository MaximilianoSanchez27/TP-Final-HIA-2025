/**
 * Estrategia de autenticación JWT para Passport
 */

const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const Usuario = require('../../models/Usuario');

/**
 * Configura la estrategia JWT para Passport
 */
module.exports = (passport) => {
    passport.use('jwt', new JwtStrategy({
        // Extraer token del encabezado Authorization
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Clave secreta para verificar firmas
        secretOrKey: process.env.JWT_SECRET || 'tu_clave_secreta_jwt',
        // Rechazar tokens expirados
        ignoreExpiration: false
    }, async (payload, done) => {
        try {
            // Buscar el usuario por ID desde el payload JWT
            const usuario = await Usuario.findByPk(payload.id, {
                include: ['rol'] // Incluir información del rol para autorización
            });
            
            if (!usuario) {
                return done(null, false, { message: 'Usuario no encontrado' });
            }
            
            // Usuario encontrado, pasar a siguiente middleware
            return done(null, usuario);
        } catch (error) {
            return done(error, false);
        }
    }));
};
