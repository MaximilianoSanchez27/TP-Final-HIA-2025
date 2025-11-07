const express = require("express");
const router = express.Router();
const cobroCtrl = require("../controllers/cobro.controller");
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Rutas públicas (solo lectura)
router.get("/", cobroCtrl.getCobros);
router.get("/filter", cobroCtrl.getCobrosFilter);
router.get("/:id", cobroCtrl.getCobro);
router.get("/club/:idClub", cobroCtrl.getCobrosByClub);
router.get("/equipo/:idEquipo", cobroCtrl.getCobrosByEquipo);

// Rutas protegidas (requieren autenticación de administrador)
router.post("/", authenticate, authorize('admin'), cobroCtrl.createCobro);
router.put("/:id", authenticate, authorize('admin'), cobroCtrl.updateCobro);
router.delete("/:id", authenticate, authorize('admin'), cobroCtrl.deleteCobro);
router.patch("/:id/estado", authenticate, authorize('admin'), cobroCtrl.cambiarEstadoCobro);

// Rutas para métricas y estadísticas
router.get("/metricas/avanzadas", cobroCtrl.getMetricasAvanzadas);
router.get("/estadisticas/recaudacion", cobroCtrl.getEstadisticasRecaudacion);

module.exports = router;
