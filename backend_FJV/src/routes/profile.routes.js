/**
 * Rutas para la gestión del perfil del usuario autenticado
 */
const express = require('express');
const router = express.Router();

const usuarioCtrl = require('../controllers/usuario.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { handleUploadErrors, processUploadedImage } = require('../middleware/upload.middleware');

// Ruta para obtener los datos del perfil del usuario logueado
// GET /api/profile
router.get('/', authenticate, usuarioCtrl.getProfile);

// Ruta para actualizar el perfil del usuario logueado
// PUT /api/profile
// Se usan los middlewares para manejar la subida de la foto de perfil
router.put('/', authenticate, handleUploadErrors, processUploadedImage, usuarioCtrl.updateProfile);

module.exports = router;
