/**
 * Middleware para manejo de subida de logos para clubes
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

// Configuración de multer con límites aumentados
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB en bytes para archivos
        fieldSize: 25 * 1024 * 1024, // 25MB para campos (incluidos los base64)
        files: 1 // Máximo 1 archivo por solicitud
    },
    fileFilter: fileFilter
});

/**
 * Extraer datos base64 del body antes de que multer los procese
 * Esto evita el error LIMIT_FIELD_VALUE
 */
const extractBase64Fields = (req, res, next) => {
    // Verificar si hay campos base64 grandes
    const base64Fields = {};
    let hasBase64 = false;
    
    // Buscar campos que parecen contener base64 y extraerlos
    if (req.body) {
        if (req.body.logo && typeof req.body.logo === 'string' && 
            req.body.logo.startsWith('data:image/')) {
            
            base64Fields.logo = req.body.logo;
            delete req.body.logo; // Eliminar del body para evitar problemas con multer
            hasBase64 = true;
            console.log(`Campo logo con base64 extraído para procesamiento posterior`);
        }
    }
    
    // Si encontramos campos base64, guardarlos para uso posterior
    if (hasBase64) {
        req.extractedBase64 = base64Fields;
    }
    
    next();
};

/**
 * Middleware para subir logo del club
 */
const uploadClubLogo = upload.fields([
    { name: 'logo', maxCount: 1 }
]);

/**
 * Middleware wrapper para manejo de errores de multer
 */
const handleUploadErrors = (req, res, next) => {
    // Si ya extraímos campos base64, pasar directamente al siguiente middleware
    if (req.extractedBase64) {
        return next();
    }
    
    uploadClubLogo(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Errores específicos de multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: "0",
                    msg: "El logo es demasiado grande. El tamaño máximo permitido es 10MB"
                });
            }
            if (err.code === 'LIMIT_FIELD_VALUE') {
                return res.status(400).json({
                    status: "0",
                    msg: "El campo base64 excede el límite de tamaño. Utilice carga de archivos en su lugar."
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    status: "0",
                    msg: "Solo se permite subir un logo por vez"
                });
            }
            
            // Para cualquier otro error, pero ignorar LIMIT_UNEXPECTED_FILE que es común
            if (err.code !== 'LIMIT_UNEXPECTED_FILE') {
                console.error('Error de Multer:', err);
                return res.status(400).json({
                    status: "0",
                    msg: `Error de subida: ${err.message}`
                });
            }
            
            // Si es un error de campo inesperado, continuamos
            console.log('Campo inesperado ignorado:', err.field);
        } else if (err) {
            // Errores del filtro personalizado u otros errores
            console.error('Error en filtro de archivo:', err);
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
 * Middleware para procesar un logo y subirlo a ImgBB
 */
const processUploadedLogo = async (req, res, next) => {
    try {
        console.log('Procesando logo del club...');
        
        let file = null;
        let base64Data = null;
        
        // Comprobar primero si tenemos campos base64 extraídos previamente
        if (req.extractedBase64 && req.extractedBase64.logo) {
            base64Data = req.extractedBase64.logo.split(';base64,').pop();
            console.log('Procesando logo base64 previamente extraído');
        }
        
        // Si no hay base64 extraído, buscar archivos subidos
        if (!base64Data) {
            // Determinar si se subió un archivo para el logo
            if (req.files && req.files.logo && req.files.logo.length > 0) {
                file = req.files.logo[0];
                console.log('Usando archivo subido como logo');
            }
            
            // Si no hay archivo ni campo base64 extraído, comprobar el body
            if (!file) {
                // Comprobar si hay campo base64 en el body (puede ser pequeño)
                if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.startsWith('data:image/')) {
                    base64Data = req.body.logo.split(';base64,').pop();
                    console.log('Procesando logo base64 del body (pequeño)');
                }
            }
        }
        
        // Si no hay archivo ni campo base64, continuamos sin procesar imagen
        if (!file && !base64Data) {
            console.log('No hay logo para procesar');
            return next();
        }

        let imageData;

        // Si hay archivo subido, usamos ese
        if (file && file.buffer) {
            console.log('Usando buffer de archivo subido (logo)');
            imageData = file.buffer;
        } 
        // Si hay datos base64, los usamos
        else if (base64Data) {
            imageData = base64Data;
        }

        // Generar un nombre único para el logo
        const clubId = req.params.id || 'new';
        const nombre = `FJV_club_${clubId}_${Date.now()}`;
        
        console.log('Subiendo logo a ImgBB...');
        
        // Subir a ImgBB
        const resultado = await imgbbService.uploadImage(imageData, nombre);
        
        if (!resultado.success) {
            console.error('Error al subir logo a ImgBB:', resultado.error);
            return res.status(500).json({
                status: "0",
                msg: "Error al subir logo a ImgBB",
                error: resultado.error
            });
        }
        
        console.log('Logo subido exitosamente. URL:', resultado.data.url);
        
        // Reemplazar el campo logo en el body con la URL de la imagen
        req.body.logo = resultado.data.url;
        
        // Guardar metadata por si se necesita
        req.imgbbData = {
            url: resultado.data.url,
            thumb: resultado.data.thumb?.url,
            delete_url: resultado.data.delete_url,
            width: resultado.data.width,
            height: resultado.data.height
        };
        
        next();
    } catch (error) {
        console.error('Error en processUploadedLogo:', error);
        res.status(500).json({
            status: "0",
            msg: "Error al procesar el logo",
            error: error.message
        });
    }
};

module.exports = {
    extractBase64Fields,
    handleUploadErrors,
    processUploadedLogo
};
