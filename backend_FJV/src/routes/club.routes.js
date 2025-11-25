const express = require("express");
const router = express.Router();
const clubCtrl = require("../controllers/club.controller");
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { 
    extractBase64Fields, 
    handleUploadErrors, 
    processUploadedLogo 
} = require('../middleware/upload-club.middleware');

// Rutas públicas - cualquiera puede ver los clubes
router.get("/filter", clubCtrl.getClubFiltro);
router.get("/", clubCtrl.getClubs);
router.get("/:id", clubCtrl.getClub);

// Rutas protegidas - solo administradores
// Añadir middlewares para procesar subida de imágenes
router.post("/", 
    authenticate, 
    authorize('admin'), 
    extractBase64Fields, 
    handleUploadErrors, 
    processUploadedLogo, 
    clubCtrl.createClub
);

router.put("/:id", 
    authenticate, 
    authorize('admin'), 
    extractBase64Fields, 
    handleUploadErrors, 
    processUploadedLogo, 
    clubCtrl.editClub
);

router.delete("/:id", authenticate, authorize('admin'), clubCtrl.deleteClub);

module.exports = router;