const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controllers/pago.controller');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth.middleware');

// Rutas públicas (cualquier usuario puede iniciar un pago)
router.post('/cobro/:idCobro/iniciar', pagoCtrl.iniciarPago);
router.get('/verificar/:paymentId', pagoCtrl.verificarPago);

// Rutas protegidas (solo administradores)
router.get('/cobro/:idCobro', authenticate, authorize('admin'), pagoCtrl.listarPagosCobro);

module.exports = router;
