//creamos el manejador de rutas
const express = require('express');
const router = express.Router();
const mpCtrl = require('../controllers/mp.controller');

//definimos las rutas para la gestion de un pago unico en mercado pago
router.post('/payment', mpCtrl.getPaymentlink);

//definimos las rutas para la gestion de un pago por suscripcion en mercado pago
//ej. pagar todos los meses $ 10.000
router.post('/subscription', mpCtrl.getSubscriptionLink);

//exportamos el modulo de rutas
module.exports = router;
