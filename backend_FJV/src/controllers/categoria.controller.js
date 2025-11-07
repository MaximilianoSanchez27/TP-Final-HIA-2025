const Categoria = require("../models/Categoria");
const Equipo = require("../models/Equipo");
const { Op } = require('sequelize');

const categoriaCtrl = {};

const TIPOS_VALIDOS = ['categoria1', 'categoria2', 'categoria3'];

categoriaCtrl.getCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.findAll({
            include: {
                model: Equipo,
                as: 'equipos', 
                attributes: ['idEquipo', 'nombre', 'nombreDelegado']
            },
            order: [
                ['nombre', 'ASC']
            ]
        });
        res.status(200).json(categorias);
    } catch (error) {
        console.error("Error en getCategorias:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación.",
            error: error.message
        });
    }
};

categoriaCtrl.createCategoria = async (req, res) => {
    try {
        const { nombre, tipo } = req.body;

        if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({
                status: "0",
                msg: `El tipo de categoría es obligatorio y debe ser válido (${TIPOS_VALIDOS.join(', ')})`
            });
        }

        const categoriaExistente = await Categoria.findOne({ 
            where: { nombre: { [Op.iLike]: nombre } } 
        });
        
        if (categoriaExistente) {
            return res.status(409).json({
                status: "0",
                msg: `Ya existe una categoría con el nombre '${nombre}'`
            });
        }

        const categoria = await Categoria.create({ nombre, tipo });
        
        res.status(201).json({
            status: "1",
            msg: "Categoría creada exitosamente",
            categoria: categoria
        });
    } catch (error) {
        console.error("Error en createCategoria:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                status: "0",
                msg: "El nombre de la categoría ya está registrado",
                error: error.message
            });
        }
        res.status(500).json({
            status: "0",
            msg: "Error al procesar la operación",
            error: error.message
        });
    }
};

categoriaCtrl.getCategoria = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id, {
            include: {
                model: Equipo,
                as: 'equipos',
                attributes: ['idEquipo', 'nombre', 'nombreDelegado']
            }
        });

        if (!categoria) {
            return res.status(404).json({
                status: "0",
                msg: "Categoría no encontrada"
            });
        }
        
        res.status(200).json(categoria);
    } catch (error) {
        console.error("Error en getCategoria:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

categoriaCtrl.editCategoria = async (req, res) => {
    try {
        const { nombre, tipo } = req.body;

        if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
            return res.status(400).json({
                status: "0",
                msg: `El tipo de categoría es obligatorio y debe ser válido (${TIPOS_VALIDOS.join(', ')})`
            });
        }

        const categoriaExistente = await Categoria.findByPk(req.params.id);
        if (!categoriaExistente) {
            return res.status(404).json({
                status: "0",
                msg: "Categoría no encontrada para actualizar"
            });
        }

        if (nombre && nombre !== categoriaExistente.nombre) {
            const nombreExistente = await Categoria.findOne({ 
                where: { 
                    nombre: { [Op.iLike]: nombre },
                    idCategoria: { [Op.ne]: req.params.id }
                } 
            });
            
            if (nombreExistente) {
                return res.status(409).json({
                    status: "0",
                    msg: `Ya existe una categoría con el nombre '${nombre}'`
                });
            }
        }

        await categoriaExistente.update({ nombre, tipo });
        
        res.status(200).json({
            status: "1",
            msg: "Categoría actualizada exitosamente",
            categoria: categoriaExistente
        });
    } catch (error) {
        console.error("Error en editCategoria:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                status: "0",
                msg: "El nombre de la categoría ya está en uso",
                error: error.message
            });
        }
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

categoriaCtrl.deleteCategoria = async (req, res) => {
    try {
        const equiposAsociados = await Equipo.count({
            where: { idCategoria: req.params.id }
        });

        if (equiposAsociados > 0) {
            return res.status(400).json({
                status: "0",
                msg: `No se puede eliminar la categoría porque tiene ${equiposAsociados} equipos asociados. Reasigne los equipos a otra categoría primero.`
            });
        }

        const deletedRows = await Categoria.destroy({
            where: { idCategoria: req.params.id }
        });

        if (deletedRows === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Categoría no encontrada para eliminar"
            });
        }

        res.status(200).json({
            status: "1",
            msg: "Categoría eliminada exitosamente"
        });
    } catch (error) {
        console.error("Error en deleteCategoria:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({
                status: "0",
                msg: "No se puede eliminar la categoría porque está asociada a equipos y la eliminación en cascada no está configurada",
                error: error.message
            });
        }
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

categoriaCtrl.getCategoriasFiltradas = async (req, res) => {
    try {
        const { nombre } = req.query;
        const criteria = {};

        if (nombre) {
            criteria.nombre = { [Op.iLike]: `%${nombre}%` };
        }

        const categorias = await Categoria.findAll({
            where: criteria,
            order: [['nombre', 'ASC']],
            include: {
                model: Equipo,
                as: 'equipos',
                attributes: ['idEquipo', 'nombre']
            }
        });

        res.status(200).json(categorias);
    } catch (error) {
        console.error("Error en getCategoriasFiltradas:", error);
        res.status(500).json({
            status: "0",
            msg: "Error procesando la operación",
            error: error.message
        });
    }
};

module.exports = categoriaCtrl;