/**
 * Middleware para manejo de subida de imágenes para personas
 */

const multer = require('multer');
const imgbbService = require('../services/imgbb.service');

// Usar memoria para subir directo a ImgBB sin archivos temporales
const storage = multer.memoryStorage();

// Filtro para tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
    console.log('🔍 Validando archivo:', file.originalname, 'Tipo:', file.mimetype);
    
    // Verificar que sea una imagen
    if (file.mimetype.startsWith('image/')) {
        // Tipos específicos permitidos
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            console.log('✅ Archivo válido:', file.mimetype);
            cb(null, true);
        } else {
            console.log('❌ Tipo de archivo no permitido:', file.mimetype);
            cb(new Error('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, GIF, WebP'), false);
        }
    } else {
        console.log('❌ El archivo no es una imagen:', file.mimetype);
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
    console.log('🔍 Extrayendo campos base64...');
    
    // Verificar si hay campos base64 grandes
    const base64Fields = {};
    let hasBase64 = false;
    
    // Buscar campos que parecen contener base64 y extraerlos
    if (req.body) {
        console.log('📋 Campos en body:', Object.keys(req.body));
        
        for (const field of ['foto', 'fotoPerfil']) {
            if (req.body[field] && typeof req.body[field] === 'string' && 
                req.body[field].startsWith('data:image/')) {
                
                console.log(`📷 Campo ${field} contiene imagen base64 (${req.body[field].length} caracteres)`);
                base64Fields[field] = req.body[field];
                delete req.body[field]; // Eliminar del body para evitar problemas con multer
                hasBase64 = true;
                console.log(`✅ Campo ${field} extraído para procesamiento posterior`);
            }
        }
    }
    
    // Si encontramos campos base64, guardarlos para uso posterior
    if (hasBase64) {
        req.extractedBase64 = base64Fields;
        console.log('💾 Campos base64 extraídos y guardados');
    } else {
        console.log('ℹ️ No se encontraron campos base64 para extraer');
    }
    
    next();
};

/**
 * Middleware para subir imagen de perfil
 * Acepta tanto 'foto' como 'fotoPerfil' como nombres de campo
 */
const uploadProfileImage = upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'fotoPerfil', maxCount: 1 }
]);

/**
 * Middleware wrapper para manejo de errores de multer
 */
const handleUploadErrors = (req, res, next) => {
    console.log('🔍 Manejando errores de upload...');
    
    // Si ya extraímos campos base64, pasar directamente al siguiente middleware
    if (req.extractedBase64) {
        console.log('✅ Usando campos base64 extraídos, saltando multer');
        return next();
    }
    
    console.log('📤 Procesando upload con multer...');
    uploadProfileImage(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('❌ Error de Multer:', err.code, err.message);
            
            // Errores específicos de multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: "0",
                    msg: "La imagen es demasiado grande. El tamaño máximo permitido es 10MB"
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
                    msg: "Solo se permite subir una foto de perfil por vez"
                });
            }
            
            // Para cualquier otro error, pero ignorar LIMIT_UNEXPECTED_FILE que es común
            // cuando se envían campos no especificados
            if (err.code !== 'LIMIT_UNEXPECTED_FILE') {
                console.error('💥 Error de Multer no manejado:', err);
                return res.status(400).json({
                    status: "0",
                    msg: `Error de subida: ${err.message}`
                });
            }
            
            // Si es un error de campo inesperado, continuamos
            console.log('⚠️ Campo inesperado ignorado:', err.field);
        } else if (err) {
            // Errores del filtro personalizado u otros errores
            console.error('💥 Error en filtro de archivo:', err);
            return res.status(400).json({
                status: "0",
                msg: err.message
            });
        }
        
        console.log('✅ Upload procesado sin errores');
        // Si no hay errores, continuar
        next();
    });
};

/**
 * Middleware para procesar una imagen base64 o un archivo y subirlo a ImgBB
 */
const processUploadedImage = async (req, res, next) => {
    try {
        console.log('🚀 Iniciando processUploadedImage...');
        console.log('📋 Método HTTP:', req.method);
        console.log('📍 URL:', req.originalUrl);
        
        let file = null;
        let fieldName = null;
        let base64Data = null;
        
        // Comprobar primero si tenemos campos base64 extraídos previamente
        if (req.extractedBase64) {
            console.log('📷 Procesando campos base64 extraídos...');
            if (req.extractedBase64.foto) {
                base64Data = req.extractedBase64.foto.split(';base64,').pop();
                fieldName = 'foto';
                console.log(`✅ Base64 extraído de campo "foto" (${base64Data.length} caracteres)`);
            } else if (req.extractedBase64.fotoPerfil) {
                base64Data = req.extractedBase64.fotoPerfil.split(';base64,').pop();
                fieldName = 'fotoPerfil';
                console.log(`✅ Base64 extraído de campo "fotoPerfil" (${base64Data.length} caracteres)`);
            }
        }
        
        // Si no hay base64 extraído, buscar archivos subidos
        if (!base64Data) {
            console.log('🔍 Buscando archivos subidos...');
            console.log('📁 Archivos disponibles:', req.files ? Object.keys(req.files) : 'ninguno');
            
            // Determinar qué campo contiene la imagen
            if (req.files && req.files.foto && req.files.foto.length > 0) {
                file = req.files.foto[0];
                fieldName = 'foto';
                console.log(`✅ Archivo encontrado en campo "foto" (${file.size} bytes)`);
            } else if (req.files && req.files.fotoPerfil && req.files.fotoPerfil.length > 0) {
                file = req.files.fotoPerfil[0];
                fieldName = 'fotoPerfil';
                console.log(`✅ Archivo encontrado en campo "fotoPerfil" (${file.size} bytes)`);
            }
            
            // Si no hay archivo ni campo base64 extraído, comprobar el body
            if (!file) {
                console.log('🔍 Buscando base64 en body...');
                // Comprobar si hay campos base64 en el body (pueden ser pequeños)
                if (req.body.foto && typeof req.body.foto === 'string' && req.body.foto.startsWith('data:image/')) {
                    base64Data = req.body.foto.split(';base64,').pop();
                    fieldName = 'foto';
                    console.log(`✅ Base64 encontrado en campo "foto" del body (${base64Data.length} caracteres)`);
                } else if (req.body.fotoPerfil && typeof req.body.fotoPerfil === 'string' && req.body.fotoPerfil.startsWith('data:image/')) {
                    base64Data = req.body.fotoPerfil.split(';base64,').pop();
                    fieldName = 'fotoPerfil';
                    console.log(`✅ Base64 encontrado en campo "fotoPerfil" del body (${base64Data.length} caracteres)`);
                }
            }
        }
        
        // Si no hay archivo ni campo base64, continuamos sin procesar imagen
        if (!file && !base64Data) {
            console.log('ℹ️ No hay imagen para procesar, continuando...');
            return next();
        }

        let imageData;

        // Si hay archivo subido, usamos ese
        if (file && file.buffer) {
            console.log(`📷 Usando buffer de archivo subido (${fieldName}, ${file.buffer.length} bytes)`);
            imageData = file.buffer;
        } 
        // Si hay datos base64, los usamos
        else if (base64Data) {
            console.log(`📷 Usando datos base64 (${fieldName}, ${base64Data.length} caracteres)`);
            imageData = base64Data;
        }

        // Generar un nombre único para la imagen
        const personaId = req.params.id || 'new';
        const timestamp = Date.now();
        const nombre = `FJV_persona_${personaId}_${timestamp}`;
        
        console.log('🏷️ Nombre de imagen generado:', nombre);
        console.log('📤 Subiendo imagen a ImgBB...');
        
        // Subir a ImgBB
        const resultado = await imgbbService.uploadImage(imageData, nombre);
        
        if (!resultado.success) {
            console.error('💥 Error al subir imagen a ImgBB:', resultado.error);
            console.error('📋 Detalles del error:', resultado.details);
            return res.status(500).json({
                status: "0",
                msg: "Error al subir imagen a ImgBB",
                error: resultado.error,
                details: resultado.details
            });
        }
        
        console.log('🎉 Imagen subida exitosamente!');
        console.log('🔗 URL de la imagen:', resultado.data.url);
        
        // Reemplazar el campo foto y fotoPerfil en el body con la URL de la imagen
        req.body.foto = resultado.data.url;
        req.body.fotoPerfil = resultado.data.url;
        
        // Guardar metadata por si se necesita
        req.imgbbData = {
            url: resultado.data.url,
            thumb: resultado.data.thumb?.url,
            delete_url: resultado.data.delete_url,
            width: resultado.data.width,
            height: resultado.data.height
        };
        
        console.log('✅ Procesamiento de imagen completado, continuando...');
        next();
    } catch (error) {
        console.error('💥 Error crítico en processUploadedImage:', error);
        console.error('📋 Stack trace:', error.stack);
        res.status(500).json({
            status: "0",
            msg: "Error crítico al procesar la imagen",
            error: error.message
        });
    }
};

module.exports = {
    extractBase64Fields,
    handleUploadErrors,
    processUploadedImage
};
