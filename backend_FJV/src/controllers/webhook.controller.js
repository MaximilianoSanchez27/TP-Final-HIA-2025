const Cobro = require('../models/Cobro');
const Pago = require('../models/Pago');
const mpService = require('../services/mercadopago.service');

const webhookCtrl = {};

/**
 * Procesar notificaciones de MercadoPago
 */
webhookCtrl.mercadoPago = async (req, res) => {
    try {
        console.log('=== WEBHOOK MERCADOPAGO RECIBIDO ===');
        console.log('Method:', req.method);
        console.log('Query:', req.query);
        console.log('Body:', req.body);
        console.log('Headers:', req.headers);
        console.log('===============================');
        
        // MercadoPago puede enviar notificaciones de diferentes formas:
        // 1. Por query parameters: ?id=XXX&topic=payment
        // 2. Por body con data.id y type
        // 3. Directamente en el body
        
        let paymentId = null;
        let notificationType = null;
        
        // Obtener ID y tipo de la notificación desde query parameters
        if (req.query.id && req.query.topic) {
            paymentId = req.query.id;
            notificationType = req.query.topic;
            console.log(`Notificación por query - ID: ${paymentId}, Topic: ${notificationType}`);
        }
        // Obtener desde el body (formato IPN)
        else if (req.body && req.body.data && req.body.data.id && req.body.type) {
            paymentId = req.body.data.id;
            notificationType = req.body.type;
            console.log(`Notificación por body - ID: ${paymentId}, Type: ${notificationType}`);
        }
        // Formato directo en body
        else if (req.body && req.body.id && req.body.type) {
            paymentId = req.body.id;
            notificationType = req.body.type;
            console.log(`Notificación directa - ID: ${paymentId}, Type: ${notificationType}`);
        }
            
        // Si no encontramos información válida, aceptar la notificación
        if (!paymentId || !notificationType) {
            console.log('Notificación sin información procesable, aceptando...');
            return res.status(200).json({ message: 'Notificación recibida sin datos procesables' });
        }
        
        // Solo procesar notificaciones de pago y merchant_order
        if (notificationType !== 'payment' && notificationType !== 'merchant_order') {
            console.log(`Tipo ${notificationType} no procesado`);
            return res.status(200).json({ message: `Notificación tipo ${notificationType} recibida pero no procesada` });
            }
            
        // Para merchant_order, simplemente aceptar (se procesa cuando llega el payment)
        if (notificationType === 'merchant_order') {
            console.log('Notificación merchant_order aceptada');
            return res.status(200).json({ message: 'Notificación merchant_order recibida' });
        }
        
        // Procesar notificación de pago
        console.log(`Procesando pago ID: ${paymentId}`);
        
        // Obtener información del pago desde MercadoPago
        const resultadoPago = await mpService.obtenerPago(paymentId);
            
        if (!resultadoPago.success) {
            console.error('Error al obtener información del pago:', resultadoPago.error);
            return res.status(200).json({ message: 'Error al obtener información del pago' });
        }
        
        const payment = resultadoPago.pago;
        console.log('Información del pago obtenida:', {
            id: payment.id,
            status: payment.status,
            external_reference: payment.external_reference,
            amount: payment.transaction_amount
        });
        
        // Mapear estado de MercadoPago a nuestro sistema
        let estadoPago = 'Pendiente';
        switch (payment.status) {
            case 'approved':
                estadoPago = 'Pagado';
                break;
            case 'pending':
                estadoPago = 'Pendiente';
                break;
            case 'in_process':
                estadoPago = 'En Proceso';
                break;
            case 'rejected':
            case 'cancelled':
                estadoPago = 'Rechazado';
                break;
            default:
                estadoPago = 'Pendiente';
            }
            
            // Verificar si el pago ya fue procesado
            const pagoExistente = await Pago.findOne({
            where: { paymentId: paymentId.toString() }
            });
            
            if (pagoExistente) {
            console.log(`Pago ${paymentId} ya existe, actualizando estado si es necesario...`);
                
                // Actualizar estado si cambió
            if (pagoExistente.estado !== estadoPago) {
                    await pagoExistente.update({ 
                    estado: estadoPago,
                        datosExtra: {
                            ...pagoExistente.datosExtra,
                        payment: payment,
                            lastUpdate: new Date()
                        }
                    });
                
                console.log(`Estado actualizado de ${pagoExistente.estado} a ${estadoPago}`);
                    
                    // Si el pago fue exitoso, actualizar el cobro
                if (estadoPago === 'Pagado' && pagoExistente.idCobro) {
                        await Cobro.update({ 
                            estado: 'Pagado',
                        comprobantePago: `MP-${paymentId}`,
                        observaciones: `Pagado mediante MercadoPago. ID de pago: ${paymentId}`
                        }, { where: { idCobro: pagoExistente.idCobro } });
                    
                    console.log(`Cobro ${pagoExistente.idCobro} marcado como pagado`);
                    }
                }
                
                return res.status(200).json({ message: 'Notificación procesada exitosamente (pago actualizado)' });
            }
            
        // Es un nuevo pago, extraer información del external_reference
        const externalRef = payment.external_reference;
        if (!externalRef || !externalRef.startsWith('cobro_')) {
            console.error('External reference inválida o no encontrada:', externalRef);
            return res.status(200).json({ message: 'External reference inválida' });
        }
        
        // Extraer ID del cobro
        const refParts = externalRef.split('_');
        const idCobro = parseInt(refParts[1]);
            
        if (!idCobro || isNaN(idCobro)) {
            console.error('No se pudo extraer el ID del cobro de:', externalRef);
            return res.status(200).json({ message: 'ID de cobro no válido en external reference' });
            }
            
            // Verificar que el cobro existe
            const cobro = await Cobro.findByPk(idCobro);
            if (!cobro) {
                console.error(`Cobro con ID ${idCobro} no encontrado`);
                return res.status(200).json({ message: `Cobro ID ${idCobro} no encontrado` });
            }
        
        console.log(`Creando nuevo pago para cobro ${idCobro}`);
            
            // Registrar el pago en nuestra base de datos
            const pago = await Pago.create({
                idCobro,
            paymentId: paymentId.toString(),
            monto: payment.transaction_amount || cobro.monto,
            estado: estadoPago,
            preferenceId: payment.preference_id || null,
                metodoPago: 'MercadoPago',
                datosExtra: {
                payment: payment,
                processed_at: new Date()
                }
            });
        
        console.log(`Pago creado con ID: ${pago.id}`);
            
            // Si el pago fue exitoso, actualizar el cobro
        if (estadoPago === 'Pagado') {
                await cobro.update({
                    estado: 'Pagado',
                comprobantePago: `MP-${paymentId}`,
                observaciones: `Pagado mediante MercadoPago. ID de pago: ${paymentId}`
                });
            
            console.log(`Cobro ${idCobro} marcado como pagado`);
        }
        
        return res.status(200).json({ 
            message: 'Notificación procesada exitosamente',
            paymentId: paymentId,
            estado: estadoPago
        });
        
    } catch (error) {
        console.error('ERROR PROCESANDO WEBHOOK:', error);
        console.error('Stack trace:', error.stack);
        
        // IMPORTANTE: Siempre devolver 200 OK para que MercadoPago no reintente
        return res.status(200).json({ 
            message: 'Error procesando notificación',
            error: error.message 
        });
    }
};

module.exports = webhookCtrl;