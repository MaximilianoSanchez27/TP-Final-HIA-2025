/**
 * Configuración central de Passport
 * 
 * Este archivo inicializa Passport y carga todas las estrategias
 * de autenticación disponibles
 */

const passport = require('passport');
const Usuario = require('../models/Usuario');

// Importar estrategias
const configureJwtStrategy = require('./auth/jwt');
const configureGoogleStrategy = require('./auth/google');
const configureLinkedInStrategy = require('./auth/linkedin');

// Configurar serialización/deserialización de usuarios
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Usuario.findByPk(id, {
            include: ['rol'] // Incluir el rol para autorización
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Configurar estrategias
configureJwtStrategy(passport);
configureGoogleStrategy(passport);
configureLinkedInStrategy(passport);

module.exports = passport;
