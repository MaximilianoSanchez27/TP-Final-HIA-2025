const Cobro = require("../models/Cobro");
const Club = require("../models/Club");
const Equipo = require("../models/Equipo");
const { Op } = require('sequelize');

const cobroCtrl = {};

// Función auxiliar para verificar y actualizar cobros vencidos
async function verificarYActualizarCobrosVencidos(cobros) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    const cobrosDatosFecha = cobros.map(cobro => {
        const fechaVencimiento = cobro.fechaVencimiento ? new Date(cobro.fechaVencimiento) : null;
        return {
            cobro,
            fechaVencimiento,
            vencido: fechaVencimiento && fechaVencimiento < hoy && cobro.estado === 'Pendiente'
        };
    });
    
    // Actualizar estados de cobros vencidos
    for (const { cobro, vencido } of cobrosDatosFecha) {
        if (vencido) {
            await cobro.update({ 
                estado: 'Vencido',
                observaciones: cobro.observaciones 
                    ? `${cobro.observaciones}\nActualizado automáticamente a Vencido por fecha de vencimiento.` 
                    : 'Actualizado automáticamente a Vencido por fecha de vencimiento.'
            });
        }
    }
    
    // Devolver los cobros actualizados
    return cobrosDatosFecha.map(({ cobro }) => cobro);
}

// Obtener todos los cobros
cobroCtrl.getCobros = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener todos los Cobros'
    #swagger.description = 'Retorna una lista de todos los cobros registrados, incluyendo información del club y equipo asociados. Actualiza automáticamente el estado de los cobros vencidos.'
    */
    try {
        let cobros = await Cobro.findAll({
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
            ],
            order: [['fechaCobro', 'DESC']]
        });
        
        // Verificar y actualizar cobros vencidos
        cobros = await verificarYActualizarCobrosVencidos(cobros);
        
        res.status(200).json(cobros);
    } catch (error) {
        console.error("Error en getCobros:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

// Crear un nuevo cobro
cobroCtrl.createCobro = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Crear un nuevo Cobro'
    #swagger.description = 'Registra un nuevo cobro asociado a un club y opcionalmente a un equipo.'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del cobro a crear.',
        required: true,
        schema: { $ref: '#/definitions/Cobro' }
    }
    */
    try {
        // Validaciones básicas
        const { concepto, monto, idClub, idEquipo } = req.body;
        
        if (!concepto || concepto.trim() === '') {
            return res.status(400).json({
                status: "0",
                msg: "El concepto del cobro es obligatorio"
            });
        }
        
        if (!monto || monto <= 0) {
            return res.status(400).json({
                status: "0",
                msg: "El monto debe ser mayor que cero"
            });
        }
        
        if (!idClub) {
            return res.status(400).json({
                status: "0",
                msg: "Debe especificar el club al que se realiza el cobro"
            });
        }
        
        // Verificar que el club exista
        const clubExistente = await Club.findByPk(idClub);
        if (!clubExistente) {
            return res.status(400).json({
                status: "0",
                msg: `El Club con ID ${idClub} no existe`
            });
        }
        
        // Verificar que el equipo exista si se proporciona
        if (idEquipo) {
            const equipoExistente = await Equipo.findByPk(idEquipo);
            if (!equipoExistente) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Equipo con ID ${idEquipo} no existe`
                });
            }
            
            // Verificar que el equipo pertenezca al club
            if (equipoExistente.idClub !== parseInt(idClub)) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Equipo con ID ${idEquipo} no pertenece al Club con ID ${idClub}`
                });
            }
        }
        
        // Crear el cobro
        const cobro = await Cobro.create(req.body);
        
        res.status(201).json({
            status: "1",
            msg: "Cobro registrado exitosamente",
            cobro: cobro
        });
    } catch (error) {
        console.error("Error en createCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Obtener cobro por ID
cobroCtrl.getCobro = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener Cobro por ID'
    #swagger.description = 'Retorna un cobro específico usando su ID, incluyendo información del club y equipo asociados.'
    */
    try {
        let cobro = await Cobro.findByPk(req.params.id, {
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
        
        // Verificar si el cobro está vencido y actualizar estado si es necesario
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (cobro.fechaVencimiento && 
            new Date(cobro.fechaVencimiento) < hoy && 
            cobro.estado === 'Pendiente') {
            
            await cobro.update({ 
                estado: 'Vencido',
                observaciones: cobro.observaciones 
                    ? `${cobro.observaciones}\nActualizado automáticamente a Vencido por fecha de vencimiento.` 
                    : 'Actualizado automáticamente a Vencido por fecha de vencimiento.'
            });
            
            // Recargar el cobro actualizado
            cobro = await Cobro.findByPk(req.params.id, {
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
        }
        
        res.status(200).json(cobro);
    } catch (error) {
        console.error("Error en getCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Actualizar cobro
cobroCtrl.updateCobro = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Actualizar un Cobro'
    #swagger.description = 'Actualiza la información de un cobro existente usando su ID.'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del cobro a actualizar.',
        required: true,
        schema: { $ref: '#/definitions/Cobro' }
    }
    */
    try {
        // Validar que el cobro exista
        const cobroExistente = await Cobro.findByPk(req.params.id);
        if (!cobroExistente) {
            return res.status(404).json({
                status: "0",
                msg: "Cobro no encontrado para actualizar"
            });
        }
        
        // Validaciones si se está cambiando el club o equipo
        if (req.body.idClub && req.body.idClub !== cobroExistente.idClub) {
            const clubExistente = await Club.findByPk(req.body.idClub);
            if (!clubExistente) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Club con ID ${req.body.idClub} no existe`
                });
            }
        }
        
        if (req.body.idEquipo && req.body.idEquipo !== cobroExistente.idEquipo) {
            const equipoExistente = await Equipo.findByPk(req.body.idEquipo);
            if (!equipoExistente) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Equipo con ID ${req.body.idEquipo} no existe`
                });
            }
            
            // Verificar que el equipo pertenezca al club (si no se está cambiando el club)
            const idClub = req.body.idClub || cobroExistente.idClub;
            if (equipoExistente.idClub !== parseInt(idClub)) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Equipo con ID ${req.body.idEquipo} no pertenece al Club con ID ${idClub}`
                });
            }
        }
        
        // Actualizar el cobro
        await cobroExistente.update(req.body);
        
        res.status(200).json({
            status: "1",
            msg: "Cobro actualizado exitosamente",
            cobro: cobroExistente
        });
    } catch (error) {
        console.error("Error en updateCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Eliminar cobro
cobroCtrl.deleteCobro = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Eliminar un Cobro'
    #swagger.description = 'Elimina un cobro de la base de datos usando su ID.'
    */
    try {
        const deletedRows = await Cobro.destroy({
            where: { idCobro: req.params.id }
        });

        if (deletedRows === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Cobro no encontrado para eliminar"
            });
        }

        res.status(200).json({
            status: "1",
            msg: "Cobro eliminado exitosamente"
        });
    } catch (error) {
        console.error("Error en deleteCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Filtrar cobros por varios criterios
cobroCtrl.getCobrosFilter = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Filtrar Cobros'
    #swagger.description = 'Retorna cobros que coinciden con los criterios de filtro (idClub, idEquipo, estado, fechaDesde, fechaHasta).'
    #swagger.parameters['idClub'] = { in: 'query', description: 'ID del club asociado.', type: 'integer' }
    #swagger.parameters['idEquipo'] = { in: 'query', description: 'ID del equipo asociado.', type: 'integer' }
    #swagger.parameters['estado'] = { in: 'query', description: 'Estado del cobro (Pendiente, Pagado, Vencido, Anulado).', type: 'string' }
    #swagger.parameters['fechaDesde'] = { in: 'query', description: 'Fecha desde (YYYY-MM-DD).', type: 'string' }
    #swagger.parameters['fechaHasta'] = { in: 'query', description: 'Fecha hasta (YYYY-MM-DD).', type: 'string' }
    */
    const { idClub, idEquipo, estado, fechaDesde, fechaHasta } = req.query;
    const criteria = {};

    // Aplicar filtros si se proporcionan
    if (idClub) {
        criteria.idClub = idClub;
    }
    
    if (idEquipo) {
        criteria.idEquipo = idEquipo;
    }
    
    if (estado) {
        criteria.estado = estado;
    }
    
    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
        criteria.fechaCobro = {};
        if (fechaDesde) {
            criteria.fechaCobro[Op.gte] = fechaDesde;
        }
        if (fechaHasta) {
            criteria.fechaCobro[Op.lte] = fechaHasta;
        }
    }

    try {
        let cobros = await Cobro.findAll({
            where: criteria,
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
            ],
            order: [['fechaCobro', 'DESC']]
        });
        
        // Verificar y actualizar cobros vencidos
        cobros = await verificarYActualizarCobrosVencidos(cobros);
        
        res.status(200).json(cobros);
    } catch (error) {
        console.error("Error en getCobrosFilter:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Obtener cobros por club específico
cobroCtrl.getCobrosByClub = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener Cobros por Club'
    #swagger.description = 'Retorna todos los cobros asociados a un club específico.'
    */
    try {
        const idClub = req.params.idClub;
        
        // Verificar que el club exista
        const clubExistente = await Club.findByPk(idClub);
        if (!clubExistente) {
            return res.status(404).json({
                status: "0",
                msg: `El Club con ID ${idClub} no existe`
            });
        }
        
        let cobros = await Cobro.findAll({
            where: { idClub },
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
            ],
            order: [['fechaCobro', 'DESC']]
        });
        
        // Verificar y actualizar cobros vencidos
        cobros = await verificarYActualizarCobrosVencidos(cobros);
        
        res.status(200).json(cobros);
    } catch (error) {
        console.error("Error en getCobrosByClub:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Obtener cobros por equipo específico
cobroCtrl.getCobrosByEquipo = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener Cobros por Equipo'
    #swagger.description = 'Retorna todos los cobros asociados a un equipo específico.'
    */
    try {
        const idEquipo = req.params.idEquipo;
        
        // Verificar que el equipo exista
        const equipoExistente = await Equipo.findByPk(idEquipo);
        if (!equipoExistente) {
            return res.status(404).json({
                status: "0",
                msg: `El Equipo con ID ${idEquipo} no existe`
            });
        }
        
        let cobros = await Cobro.findAll({
            where: { idEquipo },
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
            ],
            order: [['fechaCobro', 'DESC']]
        });
        
        // Verificar y actualizar cobros vencidos
        cobros = await verificarYActualizarCobrosVencidos(cobros);
        
        res.status(200).json(cobros);
    } catch (error) {
        console.error("Error en getCobrosByEquipo:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Cambiar estado de un cobro (ej: a 'Pagado')
cobroCtrl.cambiarEstadoCobro = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Cambiar Estado de un Cobro'
    #swagger.description = 'Actualiza el estado de un cobro existente (ej: a "Pagado", "Vencido", "Anulado").'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos para actualizar el estado del cobro.',
        required: true,
        schema: { 
            estado: 'string',
            comprobantePago: 'string',
            observaciones: 'string'
        }
    }
    */
    try {
        const { estado, comprobantePago, observaciones } = req.body;
        
        if (!estado || !['Pendiente', 'Pagado', 'Vencido', 'Anulado'].includes(estado)) {
            return res.status(400).json({
                status: "0",
                msg: "El estado debe ser 'Pendiente', 'Pagado', 'Vencido' o 'Anulado'"
            });
        }
        
        // Encontrar el cobro
        const cobro = await Cobro.findByPk(req.params.id);
        if (!cobro) {
            return res.status(404).json({
                status: "0",
                msg: "Cobro no encontrado"
            });
        }
        
        // Actualizar el estado y otros campos relacionados
        cobro.estado = estado;
        if (comprobantePago !== undefined) cobro.comprobantePago = comprobantePago;
        if (observaciones !== undefined) cobro.observaciones = observaciones;
        
        await cobro.save();
        
        res.status(200).json({
            status: "1",
            msg: `Estado del cobro actualizado a '${estado}'`,
            cobro: cobro
        });
    } catch (error) {
        console.error("Error en cambiarEstadoCobro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

// Obtener métricas avanzadas para dashboard
cobroCtrl.getMetricasAvanzadas = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener Métricas Avanzadas de Cobros'
    #swagger.description = 'Retorna métricas detalladas para gráficos y estadísticas del dashboard.'
    */
    try {
        // Obtener todos los cobros con sus relaciones
        let cobros = await Cobro.findAll({
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

        // Verificar y actualizar cobros vencidos
        cobros = await verificarYActualizarCobrosVencidos(cobros);

        // Calcular métricas generales
        const totalCobros = cobros.length;
        const totalRecaudado = cobros
            .filter(c => c.estado === 'Pagado')
            .reduce((sum, c) => sum + parseFloat(c.monto), 0);
        
        const pendientes = cobros.filter(c => c.estado === 'Pendiente');
        const totalPendiente = pendientes.reduce((sum, c) => sum + parseFloat(c.monto), 0);
        
        const vencidos = cobros.filter(c => c.estado === 'Vencido');
        const totalVencido = vencidos.reduce((sum, c) => sum + parseFloat(c.monto), 0);

        // Métricas por estado
        const metricasPorEstado = {
            Pagado: cobros.filter(c => c.estado === 'Pagado').length,
            Pendiente: pendientes.length,
            Vencido: vencidos.length,
            Anulado: cobros.filter(c => c.estado === 'Anulado').length
        };

        // Métricas por club
        const clubMap = new Map();
        cobros.forEach(cobro => {
            const clubName = cobro.club?.nombre || 'Sin Club';
            if (!clubMap.has(clubName)) {
                clubMap.set(clubName, {
                    nombre: clubName,
                    total: 0,
                    recaudado: 0,
                    pendiente: 0,
                    cantidad: 0
                });
            }
            const club = clubMap.get(clubName);
            club.total += parseFloat(cobro.monto);
            club.cantidad += 1;
            if (cobro.estado === 'Pagado') {
                club.recaudado += parseFloat(cobro.monto);
            } else if (cobro.estado === 'Pendiente' || cobro.estado === 'Vencido') {
                club.pendiente += parseFloat(cobro.monto);
            }
        });

        // Métricas mensuales (últimos 12 meses)
        const ahora = new Date();
        const metricasMensuales = [];
        
        for (let i = 11; i >= 0; i--) {
            const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
            const siguienteFecha = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
            
            const cobrosMes = cobros.filter(c => {
                const fechaCobro = new Date(c.fechaCobro);
                return fechaCobro >= fecha && fechaCobro < siguienteFecha;
            });

            const recaudadoMes = cobrosMes
                .filter(c => c.estado === 'Pagado')
                .reduce((sum, c) => sum + parseFloat(c.monto), 0);

            const pendienteMes = cobrosMes
                .filter(c => c.estado === 'Pendiente' || c.estado === 'Vencido')
                .reduce((sum, c) => sum + parseFloat(c.monto), 0);

            metricasMensuales.push({
                mes: fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
                recaudado: recaudadoMes,
                pendiente: pendienteMes,
                total: cobrosMes.length
            });
        }

        // Métricas por tipo de cobro (concepto)
        const conceptoMap = new Map();
        cobros.forEach(cobro => {
            const concepto = cobro.concepto || 'Sin Concepto';
            if (!conceptoMap.has(concepto)) {
                conceptoMap.set(concepto, {
                    concepto,
                    cantidad: 0,
                    total: 0,
                    recaudado: 0
                });
            }
            const item = conceptoMap.get(concepto);
            item.cantidad += 1;
            item.total += parseFloat(cobro.monto);
            if (cobro.estado === 'Pagado') {
                item.recaudado += parseFloat(cobro.monto);
            }
        });

        // Tasa de cobro
        const tasaCobro = totalCobros > 0 ? (metricasPorEstado.Pagado / totalCobros) * 100 : 0;

        const metricas = {
            resumen: {
                totalCobros,
                totalRecaudado: parseFloat(totalRecaudado.toFixed(2)),
                totalPendiente: parseFloat(totalPendiente.toFixed(2)),
                totalVencido: parseFloat(totalVencido.toFixed(2)),
                tasaCobro: parseFloat(tasaCobro.toFixed(2))
            },
            porEstado: metricasPorEstado,
            porClub: Array.from(clubMap.values()),
            mensuales: metricasMensuales,
            porConcepto: Array.from(conceptoMap.values()),
            fechaActualizacion: new Date()
        };

        res.status(200).json(metricas);
    } catch (error) {
        console.error("Error en getMetricasAvanzadas:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando las métricas",
            error: error.message
        });
    }
};

// Obtener estadísticas de recaudación por período
cobroCtrl.getEstadisticasRecaudacion = async (req, res) => {
    /*
    #swagger.tags = ['Cobros']
    #swagger.summary = 'Obtener Estadísticas de Recaudación'
    #swagger.description = 'Retorna estadísticas específicas de recaudación por período.'
    */
    try {
        const { periodo = 'mes', fechaInicio, fechaFin } = req.query;
        
        let whereClause = {};
        
        if (fechaInicio && fechaFin) {
            whereClause.fechaCobro = {
                [Op.between]: [fechaInicio, fechaFin]
            };
        } else {
            // Por defecto, últimos 6 meses
            const fechaLimite = new Date();
            fechaLimite.setMonth(fechaLimite.getMonth() - 6);
            whereClause.fechaCobro = {
                [Op.gte]: fechaLimite
            };
        }

        const cobros = await Cobro.findAll({
            where: whereClause,
            include: [
                {
                    model: Club,
                    as: 'club',
                    attributes: ['idClub', 'nombre']
                }
            ],
            order: [['fechaCobro', 'ASC']]
        });

        // Agrupar por período
        const estadisticas = {};
        
        cobros.forEach(cobro => {
            let clave;
            const fecha = new Date(cobro.fechaCobro);
            
            if (periodo === 'dia') {
                clave = fecha.toISOString().split('T')[0];
            } else if (periodo === 'semana') {
                const inicioSemana = new Date(fecha);
                inicioSemana.setDate(fecha.getDate() - fecha.getDay());
                clave = inicioSemana.toISOString().split('T')[0];
            } else {
                clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            }
            
            if (!estadisticas[clave]) {
                estadisticas[clave] = {
                    periodo: clave,
                    totalCobros: 0,
                    recaudado: 0,
                    pendiente: 0,
                    vencido: 0,
                    anulado: 0
                };
            }
            
            estadisticas[clave].totalCobros += 1;
            const monto = parseFloat(cobro.monto);
            
            switch (cobro.estado) {
                case 'Pagado':
                    estadisticas[clave].recaudado += monto;
                    break;
                case 'Pendiente':
                    estadisticas[clave].pendiente += monto;
                    break;
                case 'Vencido':
                    estadisticas[clave].vencido += monto;
                    break;
                case 'Anulado':
                    estadisticas[clave].anulado += monto;
                    break;
            }
        });

        const resultado = Object.values(estadisticas).sort((a, b) => 
            new Date(a.periodo) - new Date(b.periodo)
        );

        res.status(200).json({
            periodo,
            estadisticas: resultado,
            fechaActualizacion: new Date()
        });
    } catch (error) {
        console.error("Error en getEstadisticasRecaudacion:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando las estadísticas",
            error: error.message
        });
    }
};

module.exports = cobroCtrl;
