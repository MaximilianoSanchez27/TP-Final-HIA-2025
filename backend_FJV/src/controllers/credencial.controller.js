const Credencial = require("../models/Credencial");
const Persona = require("../models/Persona");
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
// Comentar temporalmente la importación de QRCode
// const QRCode = require('qrcode');

const credencialCtrl = {};

// Obtener todas las credenciales
credencialCtrl.getCredenciales = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Obtener todas las Credenciales'
    #swagger.description = 'Retorna una lista de todas las credenciales registradas con información de la persona asociada.'
    */
    try {
        const credenciales = await Credencial.findAll({
            include: {
                model: Persona,
                as: 'persona',
                attributes: ['idPersona', 'nombreApellido', 'dni']
            }
        });
        res.status(200).json(credenciales);
    } catch (error) {
        console.error("Error en getCredenciales:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};


// Crear una nueva credencial
credencialCtrl.crearCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Crear una nueva Credencial'
    #swagger.description = 'Crea una nueva credencial asociada a una persona existente.'
    */
    try {
        console.log('Datos recibidos en crearCredencial:', req.body);

        const { idPersona, fechaAlta } = req.body;

        const persona = await Persona.findByPk(idPersona);
        if (!persona) {
            return res.status(404).json({
                status: "0",
                msg: "La persona no existe"
            });
        }

        const credencialExistente = await Credencial.findOne({
            where: {
                idPersona,
                estado: 'ACTIVO'
            }
        });

        if (credencialExistente) {
            return res.status(400).json({
                status: "0",
                msg: "La persona ya tiene una credencial activa",
                credencial: credencialExistente
            });
        }

        const fechaAltaObj = fechaAlta ? new Date(fechaAlta) : new Date();
        if (fechaAlta && isNaN(fechaAltaObj.getTime())) {
            return res.status(400).json({
                status: "0",
                msg: "Formato de fecha inválido. Use YYYY-MM-DD"
            });
        }

        const fechaVencimientoObj = new Date(fechaAltaObj);
        fechaVencimientoObj.setFullYear(fechaVencimientoObj.getFullYear() + 1);

        const identificador = `FJV-${idPersona}-${fechaAltaObj.getFullYear()}-${Math.floor(Math.random() * 1000)}`;
        const fechaActual = new Date();
        const estado = fechaVencimientoObj >= fechaActual ? 'ACTIVO' : 'INACTIVO';

        const transaction = await sequelize.transaction();

        try {
            const credencial = await Credencial.create({
                identificador,
                fechaAlta: fechaAltaObj.toISOString().split('T')[0],
                fechaVencimiento: fechaVencimientoObj.toISOString().split('T')[0],
                estado,
                idPersona
            }, { transaction });

            await persona.update({
                fechaLicencia: fechaAltaObj.toISOString().split('T')[0],
                fechaLicenciaBaja: fechaVencimientoObj.toISOString().split('T')[0],
                estadoLicencia: estado
            }, { transaction });

            await transaction.commit();

            try {
                const credencialConPersona = await Credencial.findByPk(credencial.idCredencial, {
                    include: {
                        model: Persona,
                        as: 'persona',
                        attributes: ['idPersona', 'nombreApellido', 'dni', 'fotoPerfil']
                    }
                });

                return res.status(201).json({
                    status: "1",
                    msg: "Credencial creada exitosamente",
                    credencial: credencialConPersona
                });
            } catch (includeError) {
                console.warn("Credencial creada pero error al cargar datos relacionados:", includeError);
                return res.status(201).json({
                    status: "1",
                    msg: "Credencial creada exitosamente (sin datos relacionados)",
                    credencial
                });
            }
        } catch (error) {
            await transaction.rollback();
            console.error("Error en crearCredencial (transacción):", error);
            return res.status(500).json({
                status: "0",
                msg: "Error procesando la operación.",
                error: error.message
            });
        }

    } catch (error) {
        console.error("Error en crearCredencial (general):", error);
        return res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Obtener una credencial específica por ID
credencialCtrl.getCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Obtener Credencial por ID'
    #swagger.description = 'Retorna una credencial específica con detalles de la persona asociada.'
    */
    try {
        const credencial = await Credencial.findByPk(req.params.id, {
            include: {
                model: Persona,
                as: 'persona',
                attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaNacimiento', 'fotoPerfil']
            }
        });

        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }

        res.status(200).json(credencial);
    } catch (error) {
        console.error("Error en getCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Obtener credencial por identificador único
credencialCtrl.getCredencialPorIdentificador = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Obtener Credencial por Identificador'
    #swagger.description = 'Busca una credencial por su código identificador único.'
    */
    try {
        const { identificador } = req.params;

        const credencial = await Credencial.findOne({
            where: { identificador },
            include: {
                model: Persona,
                as: 'persona',
                attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaNacimiento', 'fotoPerfil']
            }
        });

        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }

        res.status(200).json(credencial);
    } catch (error) {
        console.error("Error en getCredencialPorIdentificador:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Obtener credenciales por persona
credencialCtrl.getCredencialesPorPersona = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Obtener Credenciales por Persona'
    #swagger.description = 'Retorna todas las credenciales asociadas a una persona específica.'
    */
    try {
        const { idPersona } = req.params;
        
        // Verificar que la persona existe
        const persona = await Persona.findByPk(idPersona);
        if (!persona) {
            return res.status(404).json({
                status: "0",
                msg: "La persona no existe"
            });
        }
        
        const credenciales = await Credencial.findAll({
            where: { idPersona },
            order: [['fechaAlta', 'DESC']] 
        });
        
        res.status(200).json({
            status: "1",
            credenciales,
            totalCredenciales: credenciales.length
        });
    } catch (error) {
        console.error("Error en getCredencialesPorPersona:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Actualizar credencial
credencialCtrl.actualizarCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Actualizar una Credencial'
    #swagger.description = 'Actualiza los datos de una credencial existente.'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos a actualizar',
        required: true,
        schema: { 
            fechaAlta: '2023-07-01',
            fechaVencimiento: '2024-07-01',
            estado: 'ACTIVO',
            motivoSuspension: 'Motivo de suspensión'
        }
    }
    */
    try {
        const { id } = req.params;
        const { fechaAlta, fechaVencimiento, estado, motivoSuspension } = req.body;
        
        const credencial = await Credencial.findByPk(id, {
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }
        
        // Validar formatos de fecha
        if (fechaAlta && isNaN(new Date(fechaAlta).getTime())) {
            return res.status(400).json({
                status: "0",
                msg: "Formato de fecha de alta inválido. Use YYYY-MM-DD"
            });
        }
        
        if (fechaVencimiento && isNaN(new Date(fechaVencimiento).getTime())) {
            return res.status(400).json({
                status: "0",
                msg: "Formato de fecha de vencimiento inválido. Use YYYY-MM-DD"
            });
        }
        
        // Si se cambia a estado SUSPENDIDO, verificar que haya motivo
        if (estado === 'SUSPENDIDO' && !motivoSuspension) {
            return res.status(400).json({
                status: "0",
                msg: "Debe proporcionar un motivo de suspensión."
            });
        }
        
        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Preparar datos para actualizar
            const datosActualizar = {};
            
            if (fechaAlta) datosActualizar.fechaAlta = fechaAlta;
            if (fechaVencimiento) datosActualizar.fechaVencimiento = fechaVencimiento;
            if (estado) {
                datosActualizar.estado = estado;
                // Si se suspende, guardar el motivo
                if (estado === 'SUSPENDIDO' && motivoSuspension) {
                    datosActualizar.motivoSuspension = motivoSuspension;
                }
            }
            
            await credencial.update(datosActualizar, { transaction });
            
            // Si hay cambios relevantes para la persona, actualizarla también
            if ((fechaAlta || fechaVencimiento || estado) && credencial.persona) {
                const datosPersona = {};
                
                if (fechaAlta) datosPersona.fechaLicencia = fechaAlta;
                if (fechaVencimiento) datosPersona.fechaLicenciaBaja = fechaVencimiento;
                if (estado) datosPersona.estadoLicencia = estado;
                
                await credencial.persona.update(datosPersona, { transaction });
            }
            
            await transaction.commit();
            
            // Recargar la credencial actualizada
            const credencialActualizada = await Credencial.findByPk(id, {
                include: {
                    model: Persona,
                    as: 'persona',
                    attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaLicencia', 'fechaLicenciaBaja', 'estadoLicencia']
                }
            });
            
            res.status(200).json({
                status: "1",
                msg: "Credencial actualizada exitosamente",
                credencial: credencialActualizada
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en actualizarCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Renovar una credencial (actualizar su fecha de vencimiento y sincronizar con persona)
credencialCtrl.renovarCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Renovar una Credencial'
    #swagger.description = 'Renueva una credencial existente, extendiendo su fecha de vencimiento por un año más y sincronizando la información con la persona asociada.'
    */
    try {
        const credencial = await Credencial.findByPk(req.params.id, {
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }

        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Establecer la fecha de alta como la fecha actual
            const fechaAlta = new Date();
            
            // Calcular la nueva fecha de vencimiento (1 año después de la fecha actual)
            const fechaVencimiento = new Date();
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
            
            // Actualizar la credencial
            await credencial.update({
                fechaAlta: fechaAlta.toISOString().split('T')[0],
                fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
                estado: 'ACTIVO' // Al renovar, la credencial queda activa
            }, { transaction });
            
            // Sincronizar datos con la persona asociada
            if (credencial.persona) {
                await credencial.persona.update({
                    fechaLicencia: fechaAlta.toISOString().split('T')[0],
                    fechaLicenciaBaja: fechaVencimiento.toISOString().split('T')[0],
                    estadoLicencia: 'ACTIVO'
                }, { transaction });
            }
            
            // Confirmar la transacción
            await transaction.commit();
            
            // Recargar la credencial con los datos actualizados
            const credencialActualizada = await Credencial.findByPk(req.params.id, {
                include: {
                    model: Persona,
                    as: 'persona',
                    attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaLicencia', 'fechaLicenciaBaja', 'estadoLicencia']
                }
            });
            
            res.status(200).json({
                status: "1",
                msg: "Credencial renovada exitosamente y sincronizada con la persona.",
                credencial: credencialActualizada
            });
        } catch (error) {
            // Rollback en caso de error
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en renovarCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Suspender credencial
credencialCtrl.suspenderCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Suspender una Credencial'
    #swagger.description = 'Suspende una credencial y registra el motivo de la suspensión.'
    */
    try {
        const { id } = req.params;
        const { motivoSuspension } = req.body;
        
        if (!motivoSuspension) {
            return res.status(400).json({
                status: "0",
                msg: "El motivo de suspensión es obligatorio"
            });
        }
        
        const credencial = await Credencial.findByPk(id, {
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }
        
        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Actualizar la credencial
            await credencial.update({
                estado: 'SUSPENDIDO',
                motivoSuspension
            }, { transaction });
            
            // Actualizar también la persona
            if (credencial.persona) {
                await credencial.persona.update({
                    estadoLicencia: 'SUSPENDIDO'
                }, { transaction });
            }
            
            await transaction.commit();
            
            res.status(200).json({
                status: "1",
                msg: "Credencial suspendida exitosamente",
                credencial: await Credencial.findByPk(id, {
                    include: {
                        model: Persona,
                        as: 'persona',
                        attributes: ['idPersona', 'nombreApellido', 'estadoLicencia']
                    }
                })
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en suspenderCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Reactivar credencial suspendida
credencialCtrl.reactivarCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Reactivar una Credencial'
    #swagger.description = 'Reactiva una credencial que estaba suspendida.'
    */
    try {
        const { id } = req.params;
        
        const credencial = await Credencial.findByPk(id, {
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }
        
        if (credencial.estado !== 'SUSPENDIDO') {
            return res.status(400).json({
                status: "0",
                msg: "La credencial no está suspendida."
            });
        }
        
        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Verificar si la credencial está vencida por fecha
            const fechaActual = new Date();
            const fechaVencimiento = new Date(credencial.fechaVencimiento);
            const nuevoEstado = fechaVencimiento >= fechaActual ? 'ACTIVO' : 'VENCIDO';
            
            // Actualizar la credencial
            await credencial.update({
                estado: nuevoEstado,
                motivoSuspension: null
            }, { transaction });
            
            // Actualizar también la persona
            if (credencial.persona) {
                await credencial.persona.update({
                    estadoLicencia: nuevoEstado
                }, { transaction });
            }
            
            await transaction.commit();
            
            res.status(200).json({
                status: "1",
                msg: `Credencial reactivada exitosamente. Estado actual: ${nuevoEstado}`,
                credencial: await Credencial.findByPk(id, {
                    include: {
                        model: Persona,
                        as: 'persona',
                        attributes: ['idPersona', 'nombreApellido', 'estadoLicencia']
                    }
                })
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en reactivarCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Eliminar credencial
credencialCtrl.eliminarCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Eliminar una Credencial'
    #swagger.description = 'Elimina una credencial existente por su ID.'
    */
    try {
        const { id } = req.params;
        
        const credencial = await Credencial.findByPk(id, {
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }
        
        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Si es la única credencial activa de la persona, actualizar estado de licencia de la persona
            const otrasCredencialesActivas = await Credencial.count({
                where: {
                    idPersona: credencial.idPersona,
                    estado: 'ACTIVO',
                    idCredencial: { [Op.ne]: credencial.idCredencial }
                }
            });
            
            if (credencial.estado === 'ACTIVO' && otrasCredencialesActivas === 0 && credencial.persona) {
                await credencial.persona.update({
                    estadoLicencia: 'INACTIVO'
                }, { transaction });
            }
            
            // Eliminar la credencial
            await credencial.destroy({ transaction });
            
            await transaction.commit();
            
            res.status(200).json({
                status: "1",
                msg: "Credencial eliminada exitosamente"
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en eliminarCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Actualizar el estado de todas las credenciales (verificar si siguen activas)
credencialCtrl.actualizarEstadoCredenciales = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Actualizar Estado de Credenciales'
    #swagger.description = 'Actualiza el estado de todas las credenciales verificando si su fecha de vencimiento ha expirado y sincroniza con personas.'
    */
    try {
        // Fecha actual sin la parte de hora
        const fechaActual = new Date().toISOString().split('T')[0];
        
        // Buscar todas las credenciales
        const credenciales = await Credencial.findAll({
            include: {
                model: Persona,
                as: 'persona'
            }
        });
        
        // Contador de credenciales actualizadas
        let actualizadas = 0;
        
        // Iniciar transacción
        const transaction = await sequelize.transaction();
        
        try {
            // Verificar cada credencial
            for (const credencial of credenciales) {
                // No modificar credenciales suspendidas
                if (credencial.estado === 'SUSPENDIDO') {
                    continue;
                }
                
                // Determinar el estado según la fecha de vencimiento
                let nuevoEstado;
                
                if (credencial.fechaVencimiento >= fechaActual) {
                    nuevoEstado = 'ACTIVO';
                } else {
                    nuevoEstado = 'VENCIDO';
                }
                
                // Si el estado es diferente al actual, actualizarlo
                if (credencial.estado !== nuevoEstado) {
                    await credencial.update({ estado: nuevoEstado }, { transaction });
                    actualizadas++;
                    
                    // Actualizar también la información de licencia de la persona asociada
                    if (credencial.persona) {
                        await credencial.persona.update({
                            estadoLicencia: nuevoEstado
                        }, { transaction });
                    }
                }
            }
            
            // Confirmar la transacción
            await transaction.commit();
            
            res.status(200).json({
                status: "1",
                msg: `Se actualizó el estado de ${actualizadas} credenciales.`,
                totalCredenciales: credenciales.length,
                credencialesActualizadas: actualizadas
            });
        } catch (error) {
            // Rollback en caso de error
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error en actualizarEstadoCredenciales:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Generar QR para una credencial (versión temporal sin usar QRCode)
credencialCtrl.generarQRCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Generar código QR para una Credencial'
    #swagger.description = 'Genera un código QR para una credencial basado en su identificador.'
    */
    try {
        const { identificador } = req.params;
        
        const credencial = await Credencial.findOne({
            where: { identificador },
            include: {
                model: Persona,
                as: 'persona',
                attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaNacimiento', 'fotoPerfil']
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada."
            });
        }
        
        // URL base de verificación (ajustar según el entorno)
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        
        // URL completa para verificar la credencial
        const verificationUrl = `${baseUrl}/verificar-credencial/${identificador}`;
        
        // Temporalmente, devolver solo la URL sin generar el QR
        res.status(200).json({
            status: "1",
            identificador,
            // qrCode: "Instala el paquete 'qrcode' para generar códigos QR",
            verificationUrl,
            credencial,
            mensaje: "Para generar el QR, ejecuta 'npm install qrcode' primero"
        });
    } catch (error) {
        console.error("Error en generarQRCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Validar credencial
credencialCtrl.validarCredencial = async (req, res) => {
    /*
    #swagger.tags = ['Credenciales']
    #swagger.summary = 'Validar una Credencial'
    #swagger.description = 'Valida la autenticidad y estado de una credencial por su identificador.'
    */
    try {
        const { identificador } = req.params;
        
        const credencial = await Credencial.findOne({
            where: { identificador },
            include: {
                model: Persona,
                as: 'persona',
                attributes: ['idPersona', 'nombreApellido', 'dni', 'fechaNacimiento', 'fotoPerfil', 'licenciaFEVA']
            }
        });
        
        if (!credencial) {
            return res.status(404).json({
                status: "0",
                msg: "Credencial no encontrada o inválida."
            });
        }
        
        // Verificar si la credencial está activa según la fecha actual
        const fechaActual = new Date();
        const fechaVencimiento = new Date(credencial.fechaVencimiento);
        
        // Actualizar el estado de la credencial si es necesario
        if (credencial.estado === 'ACTIVO' && fechaVencimiento < fechaActual) {
            // La credencial ha expirado pero aparece como activa
            await credencial.update({ estado: 'INACTIVO' });
            credencial.estado = 'INACTIVO'; // Actualizar el objeto en memoria
            
            // Actualizar también el estado de licencia de la persona
            if (credencial.persona) {
                await credencial.persona.update({ estadoLicencia: 'INACTIVO' });
            }
        } else if (credencial.estado === 'INACTIVO' && fechaVencimiento >= fechaActual) {
            // La credencial no ha expirado pero aparece como inactiva
            await credencial.update({ estado: 'ACTIVO' });
            credencial.estado = 'ACTIVO';
            
            // Actualizar también el estado de licencia de la persona
            if (credencial.persona) {
                await credencial.persona.update({ estadoLicencia: 'ACTIVO' });
            }
        }
        
        res.status(200).json({
            status: "1",
            msg: "Validación de credencial completa",
            valida: true,
            activa: credencial.estado === 'ACTIVO',
            credencial: {
                identificador: credencial.identificador,
                fechaAlta: credencial.fechaAlta,
                fechaVencimiento: credencial.fechaVencimiento,
                estado: credencial.estado,
                persona: credencial.persona ? {
                    nombreApellido: credencial.persona.nombreApellido,
                    dni: credencial.persona.dni,
                    fechaNacimiento: credencial.persona.fechaNacimiento,
                    fotoPerfil: credencial.persona.fotoPerfil,
                    licenciaFEVA: credencial.persona.licenciaFEVA
                } : null
            },
            fechaActual: fechaActual.toISOString().split('T')[0],
            expirada: fechaVencimiento < fechaActual
        });
    } catch (error) {
        console.error("Error en validarCredencial:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

module.exports = credencialCtrl;
