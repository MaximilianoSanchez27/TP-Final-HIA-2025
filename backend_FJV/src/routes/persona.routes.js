const express = require("express");
const personaCtrl = require("../controllers/persona.controller");
const { 
    extractBase64Fields,
    handleUploadErrors, 
    processUploadedImage 
} = require("../middleware/upload-persona.middleware");
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// --- Rutas de Estadísticas ---
// Deben ir primero para no colisionar con /:id
router.get("/resumen", personaCtrl.getResumen);
router.get("/tipo", personaCtrl.getCantidadPorCategoria);
router.get("/clubes", personaCtrl.getCantidadPorClub);
router.get("/filtro/buscar", personaCtrl.getPersonaFiltro);

// Rutas para métricas avanzadas y analíticas
router.get("/metricas/avanzadas", personaCtrl.getMetricasAvanzadas);
router.get("/estadisticas/crecimiento", personaCtrl.getEstadisticasCrecimiento);

// --- Rutas de Actualización Masiva ---
router.post(
  "/actualizar-estado-licencias",
  authenticate,
  authorize('admin'),
  personaCtrl.actualizarEstadoLicencias
);

// Rutas CRUD para personas
router.get("/", personaCtrl.getPersonas);
router.get("/:id", personaCtrl.getPersona);

// Crear persona con manejo de foto
router.post(
  "/",
  extractBase64Fields, // Nuevo middleware para extraer campos base64
  handleUploadErrors,
  processUploadedImage,
  personaCtrl.createPersona
);

// Actualizar persona con manejo de foto
router.put(
  "/:id",
  extractBase64Fields, // Nuevo middleware para extraer campos base64
  handleUploadErrors,
  processUploadedImage,
  personaCtrl.editPersona
);

router.delete("/:id", personaCtrl.deletePersona);

// Rutas para manejo de foto de perfil
router.get("/:id/foto", personaCtrl.getPersonaFoto);
router.delete("/:id/foto", personaCtrl.deleteFotoPerfil);

// Ruta para licencia individual
router.put("/:id/renovar", personaCtrl.renovarLicencia);

module.exports = router;
