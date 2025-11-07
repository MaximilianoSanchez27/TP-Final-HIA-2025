/**
 * Controlador para manejo de pagos con MercadoPago en PRODUCCIÓN
 */
const Cobro = require('../models/Cobro');
const Club = require('../models/Club');
const Equipo = require('../models/Equipo');
const Pago = require('../models/Pago');
const mpService = require('../services/mercadopago.service');

const pagoCtrl = {};

/**
 * Iniciar proceso de pago para un cobro específico en PRODUCCIÓN
 */
pagoCtrl.iniciarPago = async (req, res) => {
    /*
    #swagger.tags = ['Pagos']
    #swagger.summary = 'Iniciar proceso de pago'
    #swagger.description = 'Crea una preferencia de pago en MercadoPago para un cobro específico.'
    */
    try {
        const { idCobro } = req.params;
        const { datosPagador } = req.body;
        
        console.log("Iniciando proceso de pago con credenciales de PRODUCCIÓN");
        console.log("Token de acceso:", process.env.MP_ACCESS_TOKEN ? 
            `${process.env.MP_ACCESS_TOKEN.substring(0, 10)}...` : 
            'No configurado');
        
        // Validación adicional para pagos en producción
        if (!datosPagador || !datosPagador.email) {
            return res.status(400).json({
                status: "0",
                msg: "Los datos del pagador son incompletos. El email es obligatorio."
            });
        }
        
        // Buscar el cobro
        const cobro = await Cobro.findByPk(idCobro, {
            include: [
                {
                    model: Club,
                    as: 'club',
                    attributes: ['idClub', 'nombre']
                },
                {
                    model: Equipo,
                    as: 'equipo',
                    attributes: ['idEquipo', 'nombre']
                }
            ]
        });
        
        if (!cobro) {
            return res.status(404).json({
                status: "0",
                msg: "Cobro no encontrado"
            });
        }
        
        // Verificar si el cobro ya está pagado
        if (cobro.estado === 'Pagado') {
            return res.status(400).json({
                status: "0",
                msg: "Este cobro ya fue pagado"
            });
        }
        
        // Verificar si el cobro está anulado
        if (cobro.estado === 'Anulado') {
            return res.status(400).json({
                status: "0",
                msg: "No se puede pagar un cobro anulado"
            });
        }
        
        // Preparar datos para la preferencia de pago en producción
        const datosCobro = {
            id: cobro.idCobro,
            concepto: `${cobro.concepto}`.substring(0, 250), 
            monto: cobro.monto,
            idClub: cobro.idClub,
            idEquipo: cobro.idEquipo,
            descripcion: `${cobro.concepto} - ${cobro.club?.nombre || 'Club'} ${cobro.equipo ? ' - ' + cobro.equipo.nombre : ''}`.substring(0, 250),
            fechaVencimiento: cobro.fechaVencimiento,
            pagador: {
                ...datosPagador,
                // Asegurar que el nombre y apellido no sean vacíos
                nombre: datosPagador.nombre || 'Cliente',
                apellido: datosPagador.apellido || 'Apellido'
            }
        };
        
        // Crear preferencia de pago en PRODUCCIÓN
        console.log('Iniciando creación de preferencia para PRODUCCIÓN');
        const resultadoPreferencia = await mpService.crearPreferencia(datosCobro);
        
        if (!resultadoPreferencia.success) {
            return res.status(500).json({
                status: "0",
                msg: "Error al crear preferencia de pago",
                error: resultadoPreferencia.error
            });
        }
        
        // Registrar el intento de pago
        const pago = await Pago.create({
            idCobro: cobro.idCobro,
            monto: cobro.monto,
            estado: 'Pendiente',
            preferenceId: resultadoPreferencia.preference.id,
            metodoPago: 'MercadoPago',
            datosExtra: {
                preferencia: resultadoPreferencia.preference,
                pagador: datosPagador
            }
        });
        
        // Actualizar cobro con el ID de preferencia
        await cobro.update({
            preferenciaMP: resultadoPreferencia.preference.id
        });
        
        res.status(200).json({
            status: "1",
            msg: "Preferencia de pago creada exitosamente en PRODUCCIÓN",
            preferencia: resultadoPreferencia.preference,
            pago: pago,
            cobro: {
                id: cobro.idCobro,
                concepto: cobro.concepto,
                monto: cobro.monto,
                club: cobro.club?.nombre,
                equipo: cobro.equipo?.nombre
            },
            ambiente: "PRODUCCIÓN"
        });
    } catch (error) {
        console.error("Error en iniciarPago:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

/**
 * Verificar estado de un pago
 */
pagoCtrl.verificarPago = async (req, res) => {
    /*
    #swagger.tags = ['Pagos']
    #swagger.summary = 'Verificar estado de pago'
    #swagger.description = 'Verifica el estado actual de un pago según su ID de MercadoPago.'
    */
    try {
        const { paymentId } = req.params;
        
        // Obtener información del pago desde MercadoPago
        const resultadoPago = await mpService.obtenerPago(paymentId);
        
        if (!resultadoPago.success) {
            return res.status(500).json({
                status: "0",
                msg: "Error al obtener información del pago",
                error: resultadoPago.error
            });
        }
        
        // Buscar el pago en nuestra base de datos
        const pago = await Pago.findOne({
            where: { paymentId },
            include: {
                model: Cobro,
                as: 'cobro'
            }
        });
        
        // Si no existe en nuestra base, es posible que aún no haya llegado la notificación
        if (!pago) {
            return res.status(200).json({
                status: "1",
                msg: "Pago aún no registrado en el sistema",
                estadoMP: resultadoPago.pago.status,
                datosPago: resultadoPago.pago
            });
        }
        
        res.status(200).json({
            status: "1",
            pago,
            estadoMP: resultadoPago.pago.status,
            datosPago: resultadoPago.pago
        });
    } catch (error) {
        console.error("Error en verificarPago:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

/**
 * Listar pagos de un cobro
 */
pagoCtrl.listarPagosCobro = async (req, res) => {
    /*
    #swagger.tags = ['Pagos']
    #swagger.summary = 'Listar pagos de un cobro'
    #swagger.description = 'Retorna todos los intentos de pago asociados a un cobro específico.'
    */
    try {
        const { idCobro } = req.params;
        
        // Verificar que el cobro existe
        const cobro = await Cobro.findByPk(idCobro);
        if (!cobro) {
            return res.status(404).json({
                status: "0",
                msg: "Cobro no encontrado"
            });
        }
        
        // Buscar todos los pagos asociados al cobro
        const pagos = await Pago.findAll({
            where: { idCobro },
            order: [['createdAt', 'DESC']]
        });
        
        res.status(200).json({
            status: "1",
            pagos,
            cobro: {
                id: cobro.idCobro,
                concepto: cobro.concepto,
                monto: cobro.monto,
                estado: cobro.estado
            }
        });
    } catch (error) {
        console.error("Error en listarPagosCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

module.exports = pagoCtrl;
