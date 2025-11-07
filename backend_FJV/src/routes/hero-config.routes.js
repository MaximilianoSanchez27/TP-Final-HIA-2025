const express = require('express');
const router = express.Router();
const multer = require('multer');
const heroConfigController = require('../controllers/hero-config.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @route GET /api/hero-config
 * @desc Obtener la configuración actual del hero
 * @access Public
 */
router.get('/', heroConfigController.getHeroConfig);

/**
 * @route POST /api/hero-config/upload
 * @desc Subir imágenes a ImgBB
 * @access Private (Admin only)
 */
router.post('/upload', authenticate, heroConfigController.upload.array('images', 5), heroConfigController.uploadImages);

/**
 * @route PUT /api/hero-config
 * @desc Actualizar la configuración del hero
 * @access Private (Admin only)
 */
router.put('/', authenticate, heroConfigController.updateHeroConfig);

/**
 * @route DELETE /api/hero-config/images/:id
 * @desc Eliminar una imagen específica del carousel
 * @access Private (Admin only)
 */
router.delete('/images/:id', authenticate, heroConfigController.deleteHeroImage);

/**
 * @route PUT /api/hero-config/reorder
 * @desc Reordenar las imágenes del carousel
 * @access Private (Admin only)
 */
router.put('/reorder', authenticate, heroConfigController.reorderImages);

/**
 * @route POST /api/hero-config/add-images
 * @desc Agregar imágenes al carousel
 * @access Private (Admin only)
 */
router.post('/add-images', authenticate, heroConfigController.addImages);

module.exports = router; 