/**
 * Middleware para manejo de subida de archivos
 * Configurado para fotos de perfil con límite de 4MB
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imgbbService = require('../services/imgbb.service');

// Crear directorio para uploads si no existe
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'profile-photos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ahora usamos memoria para subir directo a ImgBB sin archivos temporales
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
        fileSize: 4 * 1024 * 1024, 
        files: 1 
    },
    fileFilter: fileFilter
});

/**
 * Middleware para subir foto de perfil
 */
const uploadProfilePhoto = upload.single('fotoPerfil');

/**
 * Middleware wrapper para manejo de errores de multer
 */
const handleUploadErrors = (req, res, next) => {
    uploadProfilePhoto(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Errores específicos de multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: "0",
                    msg: "El archivo es demasiado grande. El tamaño máximo permitido es 4MB"
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    status: "0",
                    msg: "Solo se permite subir un archivo por vez"
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    status: "0",
                    msg: "Campo de archivo inesperado. Use 'fotoPerfil' como nombre del campo"
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
 * Middleware para procesar la imagen subida y subirla a ImgBB
 */
const processUploadedImage = async (req, res, next) => {
    // Log para depuración
    console.log('processUploadedImage - req.body:', req.body);
    console.log('processUploadedImage - req.file:', req.file ? 'Archivo presente' : 'Sin archivo');
    
    if (req.file && req.file.buffer) {
        try {
            // Obtener ID para nombrar la imagen
            const personaId = req.params.id || 'new';
            
            // Subir a ImgBB
            const uploadResult = await imgbbService.uploadProfilePicture(
                req.file.buffer,
                personaId
            );
            
            if (uploadResult.success) {
                // Guardar datos relevantes de la respuesta de ImgBB
                req.imageData = {
                    fotoPerfil: uploadResult.data.url,                   
                    fotoPerfilDeleteUrl: uploadResult.data.delete_url,  
                    fotoPerfilTipo: uploadResult.data.image.mime,        
                    fotoPerfilTamano: parseInt(uploadResult.data.size)   
                };
                
                console.log('Imagen subida a ImgBB correctamente:', uploadResult.data.url);
            } else {
                console.error('Error al subir imagen a ImgBB:', uploadResult.error);
                req.imageData = null;
            }
        } catch (error) {
            console.error('Error procesando imagen para ImgBB:', error);
            req.imageData = null;
        }
    } else {
        // No hay archivo, continuar sin datos de imagen
        req.imageData = null;
        console.log('No se recibió archivo de imagen');
    }
    
    next();
};

/**
 * Función para eliminar archivo temporal si existe
 */
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error eliminando archivo temporal:', error);
    }
};

module.exports = {
    handleUploadErrors,
    processUploadedImage,
    deleteFile
};
