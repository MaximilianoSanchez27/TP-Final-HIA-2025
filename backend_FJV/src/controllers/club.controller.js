const Club = require("../models/Club");
const Persona = require("../models/Persona");
const Equipo = require("../models/Equipo");
const { Op } = require('sequelize');

const clubCtrl = {};

clubCtrl.getClubs = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Obtener todos los Clubes'
    #swagger.description = 'Retorna una lista de todos los clubes registrados, incluyendo sus personas y equipos asociados.'
    */
    try {
        const clubs = await Club.findAll({
            include: [
                {
                    model: Persona,
                    as: 'personas', 
                    attributes: ['idPersona', 'nombreApellido', 'dni', 'tipo'] 
                },
                {
                    model: Equipo,
                    as: 'equipos', 
                    attributes: ['idEquipo', 'nombre', 'nombreDelegado']
                }
            ]
        });
        res.status(200).json(clubs);
    } catch (error) {
        console.error("Error en getClubs:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

clubCtrl.createClub = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Crear un nuevo Club'
    #swagger.description = 'Agrega un nuevo club a la base de datos. Solo accesible para administradores.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del club a crear.',
        required: true,
        schema: { $ref: '#/definitions/Club' }
    }
    */
    try {
        console.log("Datos recibidos para creación:", req.body);

        // Verificar si req.body existe y no está vacío
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: "0",
                msg: "No se recibieron datos para crear el club."
            });
        }

        // Crear un objeto solo con los campos permitidos para evitar errores
        const createData = {};
        const allowedFields = [
            'nombre', 'direccion', 'telefono', 'email', 
            'cuit', 'fechaAfiliacion', 'estadoAfiliacion', 'logo'
        ];
        
        // Solo incluir campos que están presentes en req.body y están permitidos
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                createData[field] = req.body[field];
            }
        });
        
        console.log("Datos a crear:", createData);

        const club = await Club.create(createData);
        res.status(201).json({
            status: "1",
            msg: "Club creado exitosamente",
            club: club
        });
    } catch (error) {
        console.error("Error en createClub:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                status: "0",
                msg: "El email o CUIT del club ya están registrados.",
                error: error.message
            });
        }
        res.status(400).json({
            status: "0",
            msg: "Error procesando operación.",
            error: error.message
        });
    }
};

clubCtrl.getClub = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Obtener Club por ID'
    #swagger.description = 'Retorna un club específico usando su ID, incluyendo sus personas y equipos asociados.'
    */
    try {
        const club = await Club.findByPk(req.params.id, {
            include: [
                {
                    model: Persona,
                    as: 'personas',
                    attributes: ['idPersona', 'nombreApellido', 'dni', 'tipo'] 
                },
                {
                    model: Equipo,
                    as: 'equipos',
                    attributes: ['idEquipo', 'nombre', 'nombreDelegado']
                }
            ]
        });

        if (!club) {
            return res.status(404).json({
                status: "0",
                msg: "Club no encontrado."
            });
        }
        res.status(200).json(club);
    } catch (error) {
        console.error("Error en getClub:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

clubCtrl.editClub = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Actualizar un Club'
    #swagger.description = 'Actualiza la información de un club existente usando su ID. Solo accesible para administradores.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del club a actualizar.',
        required: true,
        schema: { $ref: '#/definitions/Club' }
    }
    */
    try {
        console.log("Datos recibidos para actualización:", req.body);
        
        // Verificar si req.body existe y no está vacío
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: "0",
                msg: "No se recibieron datos para actualizar el club."
            });
        }

        // Verificar si el club existe
        const clubExistente = await Club.findByPk(req.params.id);
        if (!clubExistente) {
            return res.status(404).json({
                status: "0",
                msg: "Club no encontrado para actualizar"
            });
        }

        // Crear un objeto solo con los campos permitidos para evitar errores
        const updateData = {};
        const allowedFields = [
            'nombre', 'direccion', 'telefono', 'email', 
            'cuit', 'fechaAfiliacion', 'estadoAfiliacion', 'logo'
        ];
        
        // Solo incluir campos que están presentes en req.body y están permitidos
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        
        console.log("Datos a actualizar:", updateData);

        // Actualizar el club solo con los campos permitidos
        await clubExistente.update(updateData);

        res.status(200).json({
            status: "1",
            msg: "Club actualizado exitosamente",
            club: clubExistente
        });
    } catch (error) {
        console.error("Error en editClub:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                status: "0",
                msg: "El email o CUIT del club ya están registrados en otro club.",
                error: error.message
            });
        }
        res.status(400).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

clubCtrl.deleteClub = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Eliminar un Club'
    #swagger.description = 'Elimina un club de la base de datos usando su ID. **¡Advertencia: Eliminará equipos y personas asociadas si la configuración de la base de datos permite eliminación en cascada!**'
    */
    try {
        const deletedRows = await Club.destroy({
            where: { idClub: req.params.id }
        });

        if (deletedRows === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Club no encontrado para eliminar."
            });
        }

        res.status(200).json({
            status: "1",
            msg: "Club eliminado."
        });
    } catch (error) {
        console.error("Error en deleteClub:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({
                status: "0",
                msg: "No se puede eliminar el club porque está asociado a otros registros (ej. personas o equipos) y la eliminación en cascada no está configurada.",
                error: error.message
            });
        }
        res.status(400).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

clubCtrl.getClubFiltro = async (req, res) => {
    /*
    #swagger.tags = ['Clubes']
    #swagger.summary = 'Filtrar Clubes'
    #swagger.description = 'Retorna clubes que coinciden con los criterios de filtro (nombre, cuit, estadoAfiliacion, fechaAfiliacionDesde, fechaAfiliacionHasta).'
    #swagger.parameters['nombre'] = { in: 'query', description: 'Filtra por nombre del club.', type: 'string' }
    #swagger.parameters['cuit'] = { in: 'query', description: 'Filtra por CUIT del club.', type: 'string' }
    #swagger.parameters['estadoAfiliacion'] = { in: 'query', description: 'Filtra por estado de afiliación.', type: 'string' }
    #swagger.parameters['fechaAfiliacionDesde'] = { in: 'query', description: 'Filtra por fecha de afiliación desde (YYYY-MM-DD).', type: 'string' }
    #swagger.parameters['fechaAfiliacionHasta'] = { in: 'query', description: 'Filtra por fecha de afiliación hasta (YYYY-MM-DD).', type: 'string' }
    */
    const query = req.query;
    const criteria = {};

    if (query.nombre) {
        criteria.nombre = { [Op.iLike]: `%${query.nombre}%` };
    }
    if (query.cuit) {
        criteria.cuit = { [Op.iLike]: `%${query.cuit}%` };
    }
    if (query.estadoAfiliacion) {
        criteria.estadoAfiliacion = { [Op.iLike]: `%${query.estadoAfiliacion}%` };
    }

    if (query.fechaAfiliacionDesde || query.fechaAfiliacionHasta) {
        criteria.fechaAfiliacion = {};
        if (query.fechaAfiliacionDesde) {
            criteria.fechaAfiliacion[Op.gte] = query.fechaAfiliacionDesde;
        }
        if (query.fechaAfiliacionHasta) {
            criteria.fechaAfiliacion[Op.lte] = query.fechaAfiliacionHasta;
        }
    }

    try {
        const clubs = await Club.findAll({
            where: criteria,
            include: [
                { model: Persona, as: 'personas', attributes: ['idPersona', 'nombreApellido'] },
                { model: Equipo, as: 'equipos', attributes: ['idEquipo', 'nombre'] }
            ]
        });
        res.status(200).json(clubs);
    } catch (error) {
        console.error("Error en getClubFiltro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

module.exports = clubCtrl;