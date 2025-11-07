const express = require('express');
const router = express.Router();
const noticiaCtrl = require('../controllers/noticia.controller');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth.middleware');
const { handleUploadErrors, uploadToImgBB } = require('../middleware/upload-noticias.middleware');

// IMPORTANTE: El orden de las rutas es crítico
// Las rutas más específicas deben ir ANTES que las rutas con parámetros dinámicos

// 1. Rutas para manejo de imágenes
router.post('/upload-image', 
    authenticate, 
    authorize('admin'), 
    handleUploadErrors,
    uploadToImgBB,
    noticiaCtrl.subirImagen
);
router.post('/delete-image', authenticate, authorize('admin'), noticiaCtrl.eliminarImagen);

// 2. Rutas específicas y estáticas (sin parámetros variables)
router.get('/categorias', noticiaCtrl.getCategorias);
router.get('/estadisticas', authenticate, authorize('admin'), noticiaCtrl.getEstadisticas); 
router.get('/buscar-url', optionalAuthenticate, noticiaCtrl.buscarPorUrl);
router.get('/generar-slug', noticiaCtrl.generarSlug);

// 3. Ruta general para listar noticias
router.get('/', optionalAuthenticate, noticiaCtrl.getNoticias);

// 4. Rutas protegidas para crear y administrar
router.post('/', authenticate, authorize('admin'), noticiaCtrl.crearNoticia);

// 5. Rutas con parámetros dinámicos (siempre al final)
router.get('/:id', optionalAuthenticate, noticiaCtrl.getNoticia);
router.put('/:id', authenticate, authorize('admin'), noticiaCtrl.actualizarNoticia);
router.delete('/:id', authenticate, authorize('admin'), noticiaCtrl.eliminarNoticia);
router.patch('/:id/estado', authenticate, authorize('admin'), noticiaCtrl.cambiarEstado);

// 6. Rutas para manejo de vistas de noticias (solo admin)
router.get('/:id/vistas', authenticate, authorize('admin'), noticiaCtrl.getVistasNoticia);
router.post('/:id/vista', optionalAuthenticate, noticiaCtrl.registrarVistaNoticia);

module.exports = router;
