/**
 * Utilidades para estandarizar respuestas HTTP
 * 
 * Este módulo proporciona funciones para generar respuestas
 * con formato consistente en toda la API
 */

/**
 * Genera una respuesta exitosa
 */
const success = (res, message, data = null, statusCode = 200) => {
    const response = {
        success: true,
        message
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Genera una respuesta de error
 */
const error = (res, message, error = null, statusCode = 400) => {
    const response = {
        success: false,
        message
    };
    
    if (error && process.env.NODE_ENV !== 'production') {
        response.error = typeof error === 'object' && error.message 
            ? error.message 
            : String(error);
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Respuesta específica para recurso no encontrado
 */
const notFound = (res, message = 'Recurso no encontrado') => {
    return error(res, message, null, 404);
};

/**
 * Respuesta para errores de validación
 */
const validationError = (res, message = 'Error de validación', errors = null) => {
    return error(res, message, { validation: errors }, 422);
};

module.exports = {
    success,
    error,
    notFound,
    validationError
};
