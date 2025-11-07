const express = require('express');
const router = express.Router();
const contactoCtrl = require('../controllers/contacto.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Ruta pública: obtener datos de contacto
router.get('/', contactoCtrl.getContacto);

// Ruta protegida: crear contacto (solo si aún no existe)
router.post('/', authenticate, authorize('admin'), contactoCtrl.createContacto);

// Ruta protegida: actualizar contacto (si existe, lo actualiza; si no, también puede crearlo)
router.put('/', authenticate, authorize('admin'), contactoCtrl.updateContacto);

module.exports = router;
