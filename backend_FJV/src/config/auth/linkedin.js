/**
 * Estrategia de autenticación con LinkedIn usando OAuth2
 */

const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const Usuario = require('../../models/Usuario');
const Rol = require('../../models/Rol');

// URLs y constantes
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * Configura la estrategia de autenticación de LinkedIn
 */
module.exports = (passport) => {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
        console.warn('⚠️ Credenciales de LinkedIn OAuth no configuradas');
        return;
    }
    
    // Configurar estrategia OAuth2
    passport.use('linkedin', new OAuth2Strategy({
        authorizationURL: LINKEDIN_AUTH_URL,
        tokenURL: LINKEDIN_TOKEN_URL,
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3000/api/auth/linkedin/callback',
        scope: ['openid', 'profile', 'email'],
        state: true,
        passReqToCallback: true
    }, handleLinkedInAuth));
};

/**
 * Maneja el proceso de autenticación de LinkedIn
 */
async function handleLinkedInAuth(req, accessToken, refreshToken, params, profile, done) {
    try {
        // Obtener perfil desde userinfo endpoint
        profile = await fetchUserProfile(accessToken);
        
        // Asegurar que tenemos email
        ensureProfileHasEmail(profile);
        
        // Extraer email del perfil
        const email = profile.emails[0].value;
        
        // MODIFICACIÓN: Buscar si el usuario ya existe por email
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        
        // Si el usuario no existe en la base de datos, rechazar la autenticación
        if (!usuarioExistente) {
            console.error(`Usuario con email ${email} no existe en la base de datos`);
            return done(new Error('Usuario no encontrado'), false);
        }
        
        // Buscar rol apropiado
        const rol = await buscarRolParaUsuarioSocial();
        if (!rol) {
            return done(new Error('No se encontró un rol válido para usuarios'), false);
        }
        
        // Si el usuario existe pero no tiene linkedinId, actualizarlo
        if (!usuarioExistente.linkedinId) {
            usuarioExistente.linkedinId = profile.id;
            usuarioExistente.providerType = 'linkedin';
            
            // Si el usuario no tiene foto de perfil, usar la de LinkedIn
            if (!usuarioExistente.fotoPerfil && profile.photos?.[0]?.value) {
                usuarioExistente.fotoPerfil = profile.photos[0].value;
            }
            
            await usuarioExistente.save();
        }
        
        return done(null, usuarioExistente);
    } catch (error) {
        console.error('Error en autenticación LinkedIn:', error);
        return done(error, false);
    }
}

/**
 * Obtiene el perfil del usuario desde el endpoint userinfo
 */
async function fetchUserProfile(accessToken) {
    try {
        console.log('Obteniendo información del usuario desde userinfo endpoint');
        
        const response = await axios.get(LINKEDIN_USERINFO_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'cache-control': 'no-cache'
            }
        });
        
        console.log('Respuesta del userinfo de LinkedIn:', response.data);
        
        // Convertir datos al formato que espera nuestra aplicación
        return {
            id: response.data.sub,
            displayName: response.data.name,
            name: {
                givenName: response.data.given_name,
                familyName: response.data.family_name
            },
            emails: response.data.email ? [{ value: response.data.email }] : [],
            photos: response.data.picture ? [{ value: response.data.picture }] : [],
            provider: 'linkedin'
        };
    } catch (error) {
        console.error('Error al obtener perfil de LinkedIn:', error.message);
        if (error.response) {
            console.error('Detalles del error:', error.response.data);
        }
        
        // Devolver perfil mínimo en caso de error
        return { 
            id: 'unknown',
            provider: 'linkedin',
            emails: []
        };
    }
}

/**
 * Asegura que el perfil tenga un email
 */
function ensureProfileHasEmail(profile) {
    if (!profile.emails || profile.emails.length === 0) {
        console.warn('No se pudo obtener el email del usuario de LinkedIn');
        const tempEmail = `linkedin_${profile.id}@example.com`;
        profile.emails = [{ value: tempEmail }];
        console.log('Usando email temporal:', tempEmail);
    }
}

/**
 * Busca un rol apropiado para usuarios de autenticación social
 */
async function buscarRolParaUsuarioSocial() {
    // Intentar diferentes nombres comunes para roles de usuario
    const nombresPosibles = ['usuario_social', 'user', 'usuario'];
    
    for (const nombre of nombresPosibles) {
        const rol = await Rol.findOne({ where: { nombre } });
        if (rol) return rol;
    }
    
    // Último recurso: cualquier rol que no sea admin
    const roles = await Rol.findAll();
    return roles.find(r => r.nombre !== 'admin') || roles[0] || null;
}

/**
 * Busca un usuario existente o crea uno nuevo basado en perfil de LinkedIn
 * NOTA: Esta función ahora solo se usa para actualizar usuarios existentes, no para crear nuevos
 */
async function buscarOCrearUsuario(profile, rolId) {
    const email = profile.emails[0].value;
    
    // Buscar usuario existente
    let usuario = await Usuario.findOne({ where: { linkedinId: profile.id } }) || 
                 await Usuario.findOne({ where: { email } });
    
    // Si no existe, rechazar en handleLinkedInAuth
    if (!usuario) {
        throw new Error('Usuario no encontrado en la base de datos');
    }
    
    // Si existe pero no tiene linkedinId, actualizarlo
    if (!usuario.linkedinId) {
        usuario = await actualizarUsuarioExistente(usuario, profile);
    }
    
    return usuario;
}

/**
 * Crea un nuevo usuario basado en el perfil de LinkedIn
 */
async function crearNuevoUsuario(profile, email, rolId) {
    try {
        const nombre = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Usuario';
        const apellido = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'LinkedIn';
        const fotoPerfil = profile.photos?.[0]?.value;
        
        const usuario = await Usuario.create({
            nombre,
            apellido,
            email,
            password: Math.random().toString(36).substring(2, 15),
            linkedinId: profile.id,
            providerType: 'linkedin',
            fotoPerfil,
            emailVerificado: true,
            rolId
        });
        
        console.log(`Nuevo usuario creado con LinkedIn: ${email} (${nombre} ${apellido})`);
        return usuario;
    } catch (error) {
        console.error('Error al crear usuario con LinkedIn:', error);
        throw error;
    }
}

/**
 * Actualiza un usuario existente con información de LinkedIn
 */
async function actualizarUsuarioExistente(usuario, profile) {
    usuario.linkedinId = profile.id;
    usuario.providerType = 'linkedin';
    
    if (!usuario.fotoPerfil && profile.photos?.[0]?.value) {
        usuario.fotoPerfil = profile.photos[0].value;
    }
    
    await usuario.save();
    console.log(`Usuario existente vinculado con LinkedIn: ${usuario.email}`);
    return usuario;
}
