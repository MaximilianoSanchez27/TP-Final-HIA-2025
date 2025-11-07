/**
 * Servicio para integración con MercadoPago en modo PRODUCCIÓN
 */
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

// Configuración de MercadoPago con credenciales de PRODUCCIÓN
const mercadopago = new MercadoPagoConfig({
    // Usar exclusivamente el token de acceso de producción
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: {
        timeout: 10000,
        idempotencyKey: `prod_${Date.now()}` // Clave de idempotencia única para cada sesión
    }
});

const mpService = {};

/**
 * Crear preferencia de pago para un cobro (MODO PRODUCCIÓN)
 * @param {Object} datos - Datos del cobro
 * @returns {Promise<Object>} - Preferencia creada
 */
mpService.crearPreferencia = async (datos) => {
    try {
        const { id, concepto, monto, idClub, idEquipo, descripcion, fechaVencimiento, pagador } = datos;
        
        // URL base del frontend - IMPORTANTE: asegurar que sea una URL completa y válida
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:4200';
        
        // URL base del backend para webhooks - usar variable de entorno
        let backendURL = process.env.WEBHOOK_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
        
        // Asegurar que la URL no termine con barra
        backendURL = backendURL.replace(/\/$/, '');
        
        // Construir URL de webhook correctamente
        const webhookURL = `${backendURL}/api/webhooks/mercadopago`;
        
        console.log('CREANDO PREFERENCIA EN MODO PRODUCCIÓN');
        console.log('Credenciales configuradas:', {
            accessToken: process.env.MP_ACCESS_TOKEN ? 'CONFIGURADO' : 'NO CONFIGURADO',
            publicKey: process.env.MP_PUBLIC_KEY ? 'CONFIGURADO' : 'NO CONFIGURADO',
            webhookURL: webhookURL
        });
        
        console.log('Datos de cobro:', {
            id, concepto, monto, idClub, idEquipo
        });

        // Preparación de datos para pagador real (requerido en producción)
        const datosRealPayer = {
            name: pagador?.nombre || 'Cliente',
            surname: pagador?.apellido || '',
            email: pagador?.email || 'cliente@example.com'
        };

        // Solo añadir identificación si se proporciona (requerido en producción)
        if (pagador?.documento) {
            datosRealPayer.identification = {
                type: pagador?.tipoDocumento || 'DNI',
                number: pagador?.documento
            };
        }
        
        // SOLUCIÓN: Eliminamos completamente auto_return y definimos URLs absolutas completas
        const successUrl = `${frontendURL}/pagos/success`;
        const failureUrl = `${frontendURL}/pagos/failure`;
        const pendingUrl = `${frontendURL}/pagos/pending`;

        console.log('URLs de retorno:', {
            success: successUrl,
            failure: failureUrl,
            pending: pendingUrl
        });
        
        // Crear objeto de preferencia para PRODUCCIÓN - ELIMINAMOS auto_return
        const preferenceData = {
            items: [
                {
                    id: `cobro-${id}`,
                    title: concepto,
                    quantity: 1,
                    unit_price: parseFloat(monto),
                    description: descripcion || `Pago para ${concepto}`,
                    currency_id: 'ARS'
                }
            ],
            payer: datosRealPayer,
            back_urls: {
                success: successUrl,
                failure: failureUrl,
                pending: pendingUrl
            },
            notification_url: webhookURL,
            statement_descriptor: "FJV - Fed. Jujeña Voley",
            external_reference: `cobro_${id}_club_${idClub}${idEquipo ? `_equipo_${idEquipo}` : ''}`,
            expires: false, // En producción, a menudo es mejor no establecer expiración
            // ELIMINAMOS auto_return
            metadata: {
                idCobro: id,
                idClub: idClub,
                idEquipo: idEquipo || null,
                concepto: concepto,
                ambiente: 'produccion'
            }
        };

        // Si hay fecha de vencimiento, establecerla (formato ISO)
        if (fechaVencimiento) {
            const fechaVenc = new Date(fechaVencimiento);
            if (!isNaN(fechaVenc.getTime())) {
                // Añadimos un día adicional para dar margen
                fechaVenc.setDate(fechaVenc.getDate() + 1);
                preferenceData.expiration_date_to = fechaVenc.toISOString();
            }
        }

        console.log('Token de acceso utilizado:', process.env.MP_ACCESS_TOKEN ? 
            `${process.env.MP_ACCESS_TOKEN.substring(0, 10)}...` : 
            'Usando valor predeterminado');
        
        // Imprimir objeto completo para diagnóstico
        console.log('Objeto de preferencia completo:', JSON.stringify(preferenceData, null, 2));

        // Crear la preferencia en PRODUCCIÓN
        const preference = new Preference(mercadopago);
        const result = await preference.create({ body: preferenceData });

        console.log('✅ Preferencia creada exitosamente:', result.id);
        console.log('URL de pago:', result.init_point);
        
        return {
            success: true,
            preference: result
        };
    } catch (error) {
        console.error('❌ Error al crear preferencia de pago:', error);
        console.error('Detalles adicionales:', error.cause || 'No hay detalles adicionales');
        
        // Registrar más información para depuración
        console.error('Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        return {
            success: false,
            error: error.message || 'Error desconocido en la creación de preferencia',
            details: error.cause
        };
    }
};

/**
 * Validar si una string es una URL válida
 * @param {string} string - La string a validar
 * @returns {boolean} - true si es una URL válida, false en caso contrario
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Obtener información de un pago específico
 * @param {string} paymentId - ID del pago
 * @returns {Promise<Object>} - Información del pago
 */
mpService.obtenerPago = async (paymentId) => {
    try {
        const payment = new Payment(mercadopago);
        const resultado = await payment.get({ id: paymentId });
        
        return {
            success: true,
            pago: resultado
        };
    } catch (error) {
        console.error('Error al obtener información del pago:', error);
        return {
            success: false,
            error: error.message || 'Error desconocido'
        };
    }
};

/**
 * Validar y procesar una notificación de pago
 * @param {Object} notification - Datos de la notificación
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
mpService.procesarNotificacion = async (notification) => {
    try {
        // Verificar que la notificación sea de un pago
        if (notification.type !== 'payment') {
            return {
                success: false,
                error: `Tipo de notificación no soportado: ${notification.type}`
            };
        }

        // Obtener información del pago
        const paymentId = notification.data.id;
        const paymentInfo = await mpService.obtenerPago(paymentId);
        
        if (!paymentInfo.success) {
            return {
                success: false,
                error: `Error al obtener información del pago: ${paymentInfo.error}`
            };
        }

        const payment = paymentInfo.pago;
        
        // Extraer external_reference para identificar el cobro
        const externalReference = payment.external_reference;
        
        // Analizar el estado del pago
        let estadoPago;
        switch (payment.status) {
            case 'approved':
                estadoPago = 'Pagado';
                break;
            case 'pending':
                estadoPago = 'Pendiente';
                break;
            case 'in_process':
                estadoPago = 'Pendiente';
                break;
            case 'rejected':
                estadoPago = 'Rechazado';
                break;
            case 'refunded':
                estadoPago = 'Reembolsado';
                break;
            case 'cancelled':
                estadoPago = 'Anulado';
                break;
            default:
                estadoPago = 'Desconocido';
        }
        
        return {
            success: true,
            paymentId,
            externalReference,
            estadoPago,
            payment
        };
    } catch (error) {
        console.error('Error al procesar notificación:', error);
        return {
            success: false,
            error: error.message || 'Error desconocido'
        };
    }
};

module.exports = mpService;
