const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const {
  getMomentosDestacadosConfig,
  updateMomentosDestacadosConfig,
  deleteMomentoDestacadoImage,
  reorderImages
} = require('../controllers/momentos-destacados.controller');

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
    files: 6 // Máximo 6 archivos
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y WebP son válidos.'), false);
    }
  }
});

// Rutas públicas
router.get('/', getMomentosDestacadosConfig);

// Rutas protegidas (requieren autenticación)
router.put('/', authenticate, upload.array('imagenes', 6), updateMomentosDestacadosConfig);
router.delete('/images/:id', authenticate, deleteMomentoDestacadoImage);
router.put('/reorder', authenticate, reorderImages);

// Manejo de errores de multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: '0',
        msg: 'El archivo excede el tamaño máximo permitido (5MB)'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: '0',
        msg: 'Se excedió el número máximo de archivos permitidos (6)'
      });
    }
  }
  
  if (err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      status: '0',
      msg: err.message
    });
  }

  next(err);
});

module.exports = router; 