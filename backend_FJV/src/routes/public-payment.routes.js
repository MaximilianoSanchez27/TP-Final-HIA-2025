const express = require("express");
const router = express.Router();
const publicPaymentCtrl = require("../controllers/public-payment.controller");
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Rutas públicas (sin autenticación)
router.get("/cobro/:slug", publicPaymentCtrl.getPublicPaymentBySlug);
router.patch("/cobro/:slug/access", publicPaymentCtrl.incrementAccessCount);

// Rutas protegidas (requieren autenticación de administrador)
router.post("/generate", authenticate, authorize('admin'), publicPaymentCtrl.generatePublicPaymentLink);
router.get("/cobro/:cobroId/links", authenticate, authorize('admin'), publicPaymentCtrl.getPublicPaymentLinksForCobro);
router.patch("/link/:linkId/toggle", authenticate, authorize('admin'), publicPaymentCtrl.togglePublicPaymentLink);
router.delete("/link/:linkId", authenticate, authorize('admin'), publicPaymentCtrl.deletePublicPaymentLink);

// Rutas para estadísticas
router.get("/stats", authenticate, authorize('admin'), publicPaymentCtrl.getPublicPaymentStats);

module.exports = router; 