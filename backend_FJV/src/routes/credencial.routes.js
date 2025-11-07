const express = require('express');
const router = express.Router();
const credencialCtrl = require('../controllers/credencial.controller');

// El orden de las rutas es crítico - las rutas específicas deben ir ANTES de las que usan parámetros
// Rutas CRUD para credenciales
router.get('/', credencialCtrl.getCredenciales);
router.post('/', credencialCtrl.crearCredencial);
router.get('/estado/actualizar', credencialCtrl.actualizarEstadoCredenciales);
router.get('/persona/:idPersona', credencialCtrl.getCredencialesPorPersona);
router.get('/identificador/:identificador', credencialCtrl.getCredencialPorIdentificador);
router.get('/qr/:identificador', credencialCtrl.generarQRCredencial);
router.get('/validar/:identificador', credencialCtrl.validarCredencial);
router.put('/renovar/:id', credencialCtrl.renovarCredencial);
// Nuevas rutas para estados adicionales
router.put('/suspender/:id', credencialCtrl.suspenderCredencial);
router.put('/reactivar/:id', credencialCtrl.reactivarCredencial);
// Las rutas con parámetros simples deben ir AL FINAL para evitar conflictos
router.get('/:id', credencialCtrl.getCredencial);
router.put('/:id', credencialCtrl.actualizarCredencial);
router.delete('/:id', credencialCtrl.eliminarCredencial);

module.exports = router;
