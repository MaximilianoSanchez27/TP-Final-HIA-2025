const axios = require('axios');
const FormData = require('form-data');

// API Key de ImgBB - debería estar en variables de entorno
// Agregamos una API key temporal para desarrollo
const IMGBB_API_KEY = process.env.IMGBB_API_KEY; // API key temporal

const imgbbService = {
    /**
     * Sube una imagen a ImgBB
     * @param {Buffer|string} imageData - Buffer de la imagen o string base64
     * @param {string} name - Nombre para la imagen
     * @returns {Promise} Resultado de la operación
     */
    uploadImage: async (imageData, name) => {
        try {
            console.log('🔍 Iniciando subida a ImgBB...');
            console.log('📋 API Key disponible:', IMGBB_API_KEY ? 'Sí' : 'No');
            
            if (!IMGBB_API_KEY) {
                throw new Error('ImgBB API Key no configurada');
            }

            const form = new FormData();
            form.append('key', IMGBB_API_KEY);
            
            // Puede ser un buffer o string base64 (sin el prefijo data:image/*)
            if (Buffer.isBuffer(imageData)) {
                console.log('📷 Procesando imagen desde buffer...');
                form.append('image', imageData.toString('base64'));
            } else {
                console.log('📷 Procesando imagen desde base64...');
                // Si es un string base64, verificar que no tenga el prefijo data:image/
                const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
                form.append('image', cleanBase64);
            }
            
            if (name) {
                form.append('name', name);
            }

            console.log('🚀 Enviando petición a ImgBB...');
            const response = await axios.post('https://api.imgbb.com/1/upload', form, {
                headers: form.getHeaders(),
                timeout: 30000 // 30 segundos de timeout
            });

            console.log('✅ Respuesta de ImgBB recibida:', response.data.success);

            if (response.data.success) {
                console.log('🎉 Imagen subida exitosamente a ImgBB');
                console.log('🔗 URL de la imagen:', response.data.data.url);
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                console.error('❌ Error en respuesta de ImgBB:', response.data);
                throw new Error('Error en respuesta de ImgBB: ' + (response.data.error?.message || 'Respuesta no exitosa'));
            }
        } catch (error) {
            console.error('💥 Error en imgbbService.uploadImage:', error);
            
            // Manejo más específico de errores
            let errorMessage = 'Error al subir imagen a ImgBB';
            
            if (error.response) {
                // Error de respuesta HTTP
                console.error('📊 Status de respuesta:', error.response.status);
                console.error('📋 Datos de respuesta:', error.response.data);
                
                if (error.response.status === 400) {
                    errorMessage = 'Error 400: Datos de imagen inválidos o API key incorrecta';
                } else if (error.response.status === 401) {
                    errorMessage = 'Error 401: API key de ImgBB inválida o expirada';
                } else if (error.response.status === 429) {
                    errorMessage = 'Error 429: Límite de peticiones excedido en ImgBB';
                } else {
                    errorMessage = `Error HTTP ${error.response.status}: ${error.response.data?.error?.message || 'Error del servidor ImgBB'}`;
                }
            } else if (error.request) {
                // Error de conexión
                console.error('🌐 Error de conexión:', error.message);
                errorMessage = 'Error de conexión con ImgBB. Verifique su conexión a internet';
            } else if (error.code === 'ECONNABORTED') {
                // Timeout
                errorMessage = 'Timeout: La subida a ImgBB tardó demasiado tiempo';
            }
            
            return {
                success: false,
                error: errorMessage,
                details: error.message
            };
        }
    }
};

module.exports = imgbbService;
