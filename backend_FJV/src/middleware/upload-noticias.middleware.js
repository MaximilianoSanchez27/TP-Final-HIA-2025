/**
 * Middleware para manejo de subida de imágenes para noticias
 */

const multer = require('multer');
const imgbbService = require('../services/imgbb.service');

// Usar memoria para subir directo a ImgBB sin archivos temporales
const storage = multer.memoryStorage();

// Filtro para tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
    // Verificar que sea una imagen
    if (file.mimetype.startsWith('image/')) {
        // Tipos específicos permitidos
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, GIF, WebP'), false);
        }
    } else {
        cb(new Error('El archivo debe ser una imagen'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, 
        files: 1 
    },
    fileFilter: fileFilter
});

/**
 * Middleware para subir imagen para noticia
 */
const uploadNoticiaImagen = upload.single('imagen');

/**
 * Middleware wrapper para manejo de errores de multer
 */
const handleUploadErrors = (req, res, next) => {
    uploadNoticiaImagen(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Errores específicos de multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: "0",
                    msg: "El archivo es demasiado grande. El tamaño máximo permitido es 5MB"
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    status: "0",
                    msg: "Solo se permite subir un archivo por vez"
                });
            }
            return res.status(400).json({
                status: "0",
                msg: `Error de subida: ${err.message}`
            });
        } else if (err) {
            // Errores del filtro personalizado
            return res.status(400).json({
                status: "0",
                msg: err.message
            });
        }
        
        // Si no hay errores, continuar
        next();
    });
};

/**
 * Middleware para subir imagen a ImgBB
 */
const uploadToImgBB = async (req, res, next) => {
    try {
        // Verificar si hay archivo
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                status: "0",
                msg: "No se recibió ninguna imagen"
            });
        }
        
        // Generar nombre para la imagen
        const nombre = `FJV_noticia_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        
        // Subir a ImgBB
        const resultado = await imgbbService.uploadImage(req.file.buffer, nombre);
        
        if (!resultado.success) {
            return res.status(500).json({
                status: "0",
                msg: "Error al subir imagen a ImgBB",
                error: resultado.error
            });
        }
        
        // Guardar respuesta de ImgBB en req para uso posterior
        req.imgbbData = {
            url: resultado.data.url,
            thumb: resultado.data.thumb.url,
            medium: resultado.data.medium?.url,
            delete_url: resultado.data.delete_url,
            title: nombre,
            width: resultado.data.width,
            height: resultado.data.height,
            size: resultado.data.size
        };
        
        next();
    } catch (error) {
        console.error('Error en uploadToImgBB:', error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la imagen",
            error: error.message
        });
    }
};

module.exports = {
    handleUploadErrors,
    uploadToImgBB
};
