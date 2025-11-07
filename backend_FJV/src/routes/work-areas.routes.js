const express = require('express');
const router = express.Router();
const workAreasController = require('../controllers/work-areas.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @route GET /api/work-areas
 * @desc Obtener la configuración actual de las áreas de trabajo
 * @access Public
 */
router.get('/', workAreasController.getWorkAreasConfig);

/**
 * @route PUT /api/work-areas
 * @desc Actualizar la configuración de las áreas de trabajo
 * @access Private (Admin only)
 */
router.put('/', authenticate, workAreasController.updateWorkAreasConfig);

/**
 * @route DELETE /api/work-areas/areas/:areaId
 * @desc Eliminar un área de trabajo específica
 * @access Private (Admin only)
 */
router.delete('/areas/:areaId', authenticate, workAreasController.deleteWorkArea);

/**
 * @route PUT /api/work-areas/reorder
 * @desc Reordenar las áreas de trabajo
 * @access Private (Admin only)
 */
router.put('/reorder', authenticate, workAreasController.reorderWorkAreas);

module.exports = router; 