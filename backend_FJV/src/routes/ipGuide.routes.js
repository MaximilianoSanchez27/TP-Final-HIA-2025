const express = require('express');
const router = express.Router();
const ipGuideController = require('../controllers/ipGuideController');

/**
 * Rutas para la API de IP Guide
 * Documentación: https://ip.guide/
 */

// Obtener información de la IP actual del servidor
router.get('/current', ipGuideController.getCurrentIPInfo);

// Obtener información de una IP específica
router.get('/ip/:ip', ipGuideController.getIPInfo);

// Obtener información de una red CIDR
router.get('/network/:cidr', ipGuideController.getNetworkInfo);

// Obtener información de un Sistema Autónomo (ASN)
router.get('/asn/:asn', ipGuideController.getASNInfo);

// Validar formato de una IP
router.get('/validate/ip/:ip', ipGuideController.validateIP);

// Validar formato de una notación CIDR
router.get('/validate/cidr/:cidr', ipGuideController.validateCIDR);

module.exports = router; 