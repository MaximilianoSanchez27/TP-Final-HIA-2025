const Equipo = require("../models/Equipo");
const Club = require("../models/Club");
const Categoria = require("../models/Categoria");
const { Op } = require('sequelize');

const equipoCtrl = {};

equipoCtrl.getEquipos = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Obtener todos los Equipos'
    #swagger.description = 'Retorna una lista de todos los equipos registrados, incluyendo la información de su club y categoría asociados.'
    */
    try {
        const equipos = await Equipo.findAll({
            include: [
                {
                    model: Club,
                    as: 'club', 
                    attributes: ['idClub', 'nombre', 'email']
                },
                {
                    model: Categoria,
                    as: 'categoria', 
                    attributes: ['idCategoria', 'nombre', 'edadMinima', 'edadMaxima']
                }
            ]
        });
        res.status(200).json(equipos);
    } catch (error) {
        console.error("Error en getEquipos:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

equipoCtrl.createEquipo = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Crear un nuevo Equipo'
    #swagger.description = 'Agrega un nuevo equipo a la base de datos. Requiere idClub y idCategoria.'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del equipo a crear.',
        required: true,
        schema: { $ref: '#/definitions/Equipo' }
    }
    */
    try {
        const { idClub, idCategoria, ...equipoData } = req.body;

        // Validar que el Club y la Categoría existan
        const clubExistente = await Club.findByPk(idClub);
        if (!clubExistente) {
            return res.status(400).json({
                status: "0",
                msg: `El Club con ID ${idClub} no existe.`
            });
        }
        const categoriaExistente = await Categoria.findByPk(idCategoria);
        if (!categoriaExistente) {
            return res.status(400).json({
                status: "0",
                msg: `La Categoría con ID ${idCategoria} no existe.`
            });
        }

        const newEquipo = await Equipo.create({ ...equipoData, idClub, idCategoria });
        res.status(201).json({
            status: "1",
            msg: "Equipo guardado.",
            equipo: newEquipo
        });
    } catch (error) {
        console.error("Error en createEquipo:", error);
        res.status(400).json({
            status: "0",
            msg: "Error procesando operación.",
            error: error.message
        });
    }
};

equipoCtrl.getEquipo = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Obtener Equipo por ID'
    #swagger.description = 'Retorna un equipo específico usando su ID, incluyendo la información de su club y categoría asociados.'
    */
    try {
        const equipo = await Equipo.findByPk(req.params.id, {
            include: [
                {
                    model: Club,
                    as: 'club',
                    attributes: ['idClub', 'nombre', 'email']
                },
                {
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['idCategoria', 'nombre', 'edadMinima', 'edadMaxima']
                }
            ]
        });

        if (!equipo) {
            return res.status(404).json({
                status: "0",
                msg: "Equipo no encontrado."
            });
        }
        res.status(200).json(equipo);
    } catch (error) {
        console.error("Error en getEquipo:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

equipoCtrl.editEquipo = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Actualizar un Equipo'
    #swagger.description = 'Actualiza la información de un equipo existente usando su ID. Permite modificar idClub y idCategoria.'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Datos del equipo a actualizar.',
        required: true,
        schema: { $ref: '#/definitions/Equipo' }
    }
    */
    try {
        const { idClub, idCategoria, ...equipoData } = req.body;

        // Validar Club y Categoría si se proporcionan en la actualización
        if (idClub) {
            const clubExistente = await Club.findByPk(idClub);
            if (!clubExistente) {
                return res.status(400).json({
                    status: "0",
                    msg: `El Club con ID ${idClub} no existe.`
                });
            }
        }
        if (idCategoria) {
            const categoriaExistente = await Categoria.findByPk(idCategoria);
            if (!categoriaExistente) {
                return res.status(400).json({
                    status: "0",
                    msg: `La Categoría con ID ${idCategoria} no existe.`
                });
            }
        }

        const [updatedRowsCount, updatedEquipos] = await Equipo.update({ ...equipoData, idClub, idCategoria }, {
            where: { idEquipo: req.params.id },
            returning: true
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Equipo no encontrado para actualizar."
            });
        }

        res.status(200).json({
            status: "1",
            msg: "Equipo actualizado.",
            equipo: updatedEquipos[0]
        });
    } catch (error) {
        console.error("Error en editEquipo:", error);
        res.status(400).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

equipoCtrl.deleteEquipo = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Eliminar un Equipo'
    #swagger.description = 'Elimina un equipo de la base de datos usando su ID.'
    */
    try {
        const deletedRows = await Equipo.destroy({
            where: { idEquipo: req.params.id }
        });

        if (deletedRows === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Equipo no encontrado para eliminar."
            });
        }

        res.status(200).json({
            status: "1",
            msg: "Equipo eliminado."
        });
    } catch (error) {
        console.error("Error en deleteEquipo:", error);
        res.status(400).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

equipoCtrl.getEquipoFiltro = async (req, res) => {
    /*
    #swagger.tags = ['Equipos']
    #swagger.summary = 'Filtrar Equipos'
    #swagger.description = 'Retorna equipos que coinciden con los criterios de filtro (nombre, idClub, idCategoria).'
    #swagger.parameters['nombre'] = { in: 'query', description: 'Filtra por nombre del equipo.', type: 'string' }
    #swagger.parameters['idClub'] = { in: 'query', description: 'Filtra por ID del Club asociado.', type: 'integer' }
    #swagger.parameters['idCategoria'] = { in: 'query', description: 'Filtra por ID de la Categoría asociada.', type: 'integer' }
    */
    const query = req.query;
    const criteria = {};

    if (query.nombre) {
        criteria.nombre = { [Op.iLike]: `%${query.nombre}%` };
    }
    if (query.idClub) {
        criteria.idClub = query.idClub;
    }
    if (query.idCategoria) {
        criteria.idCategoria = query.idCategoria;
    }

    try {
        const equipos = await Equipo.findAll({
            where: criteria,
            include: [
                { model: Club, as: 'club', attributes: ['idClub', 'nombre'] },
                { model: Categoria, as: 'categoria', attributes: ['idCategoria', 'nombre'] }
            ]
        });
        res.status(200).json(equipos);
    } catch (error) {
        console.error("Error en getEquipoFiltro:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

module.exports = equipoCtrl;