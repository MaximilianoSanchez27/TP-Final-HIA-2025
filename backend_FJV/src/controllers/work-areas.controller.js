const WorkAreasConfig = require('../models/WorkAreasConfig');
const WorkArea = require('../models/WorkArea');

/**
 * Obtener la configuración actual de las áreas de trabajo
 */
const getWorkAreasConfig = async (req, res) => {
  try {
    let config = await WorkAreasConfig.findOne({
      where: { activo: true },
      include: [{
        model: WorkArea,
        as: 'WorkAreas',
        where: { activo: true },
        required: false
      }],
      order: [[{ model: WorkArea, as: 'WorkAreas' }, 'orden', 'ASC']]
    });

    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = await createDefaultConfig();
    }

    // Asegurarse de que las áreas estén ordenadas
    if (config.WorkAreas) {
      config.WorkAreas.sort((a, b) => a.orden - b.orden);
    }

    res.status(200).json({
      status: '1',
      msg: 'Configuración obtenida exitosamente',
      data: {
        idConfig: config.idConfig,
        tituloSeccion: config.tituloSeccion,
        areas: config.WorkAreas || [],
        activo: config.activo,
        fechaCreacion: config.fechaCreacion,
        fechaActualizacion: config.fechaActualizacion
      }
    });
  } catch (error) {
    console.error('Error obteniendo configuración de áreas de trabajo:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      data: null
    });
  }
};

/**
 * Actualizar la configuración de las áreas de trabajo
 */
const updateWorkAreasConfig = async (req, res) => {
  try {
    const { tituloSeccion, areas } = req.body;

    // Validaciones básicas
    if (!tituloSeccion || !areas || !Array.isArray(areas)) {
      return res.status(400).json({
        status: '0',
        msg: 'Datos incompletos o inválidos',
        data: null
      });
    }

    // Buscar configuración existente o crear nueva
    let config = await WorkAreasConfig.findOne({ where: { activo: true } });
    
    if (!config) {
      config = await WorkAreasConfig.create({
        tituloSeccion,
        activo: true
      });
    } else {
      await config.update({
        tituloSeccion,
        fechaActualizacion: new Date()
      });
    }

    // Desactivar todas las áreas existentes
    await WorkArea.update(
      { activo: false },
      { where: { idConfig: config.idConfig } }
    );

    // Crear o actualizar áreas
    const areasData = areas.map((area, index) => ({
      idConfig: config.idConfig,
      titulo: area.titulo,
      descripcion: area.descripcion,
      icono: area.icono,
      orden: index + 1,
      activo: true
    }));

    await WorkArea.bulkCreate(areasData, {
      updateOnDuplicate: ['titulo', 'descripcion', 'icono', 'orden', 'activo', 'fechaActualizacion']
    });

    // Obtener configuración actualizada
    const updatedConfig = await WorkAreasConfig.findOne({
      where: { idConfig: config.idConfig },
      include: [{
        model: WorkArea,
        as: 'WorkAreas',
        where: { activo: true },
        required: false
      }],
      order: [[{ model: WorkArea, as: 'WorkAreas' }, 'orden', 'ASC']]
    });

    res.status(200).json({
      status: '1',
      msg: 'Configuración actualizada exitosamente',
      data: {
        idConfig: updatedConfig.idConfig,
        tituloSeccion: updatedConfig.tituloSeccion,
        areas: updatedConfig.WorkAreas || [],
        activo: updatedConfig.activo,
        fechaCreacion: updatedConfig.fechaCreacion,
        fechaActualizacion: updatedConfig.fechaActualizacion
      }
    });
  } catch (error) {
    console.error('Error actualizando configuración de áreas de trabajo:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      data: null
    });
  }
};

/**
 * Eliminar un área de trabajo específica
 */
const deleteWorkArea = async (req, res) => {
  try {
    const { areaId } = req.params;

    const area = await WorkArea.findByPk(areaId);
    if (!area) {
      return res.status(404).json({
        status: '0',
        msg: 'Área de trabajo no encontrada',
        data: null
      });
    }

    await area.update({ activo: false });

    // Reordenar las áreas restantes
    const remainingAreas = await WorkArea.findAll({
      where: { idConfig: area.idConfig, activo: true },
      order: [['orden', 'ASC']]
    });

    for (let i = 0; i < remainingAreas.length; i++) {
      await remainingAreas[i].update({ orden: i + 1 });
    }

    // Obtener configuración actualizada
    const config = await WorkAreasConfig.findOne({
      where: { idConfig: area.idConfig },
      include: [{
        model: WorkArea,
        as: 'WorkAreas',
        where: { activo: true },
        required: false
      }],
      order: [[{ model: WorkArea, as: 'WorkAreas' }, 'orden', 'ASC']]
    });

    res.status(200).json({
      status: '1',
      msg: 'Área eliminada exitosamente',
      data: {
        idConfig: config.idConfig,
        tituloSeccion: config.tituloSeccion,
        areas: config.WorkAreas || [],
        activo: config.activo,
        fechaCreacion: config.fechaCreacion,
        fechaActualizacion: config.fechaActualizacion
      }
    });
  } catch (error) {
    console.error('Error eliminando área de trabajo:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      data: null
    });
  }
};

/**
 * Reordenar las áreas de trabajo
 */
const reorderWorkAreas = async (req, res) => {
  try {
    const { areaIds } = req.body;

    if (!Array.isArray(areaIds)) {
      return res.status(400).json({
        status: '0',
        msg: 'IDs de áreas inválidos',
        data: null
      });
    }

    // Actualizar el orden de cada área
    for (let i = 0; i < areaIds.length; i++) {
      await WorkArea.update(
        { orden: i + 1 },
        { where: { idArea: areaIds[i] } }
      );
    }

    // Obtener configuración actualizada
    const area = await WorkArea.findByPk(areaIds[0]);
    const config = await WorkAreasConfig.findOne({
      where: { idConfig: area.idConfig },
      include: [{
        model: WorkArea,
        as: 'WorkAreas',
        where: { activo: true },
        required: false
      }],
      order: [[{ model: WorkArea, as: 'WorkAreas' }, 'orden', 'ASC']]
    });

    res.status(200).json({
      status: '1',
      msg: 'Áreas reordenadas exitosamente',
      data: {
        idConfig: config.idConfig,
        tituloSeccion: config.tituloSeccion,
        areas: config.WorkAreas || [],
        activo: config.activo,
        fechaCreacion: config.fechaCreacion,
        fechaActualizacion: config.fechaActualizacion
      }
    });
  } catch (error) {
    console.error('Error reordenando áreas de trabajo:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      data: null
    });
  }
};

/**
 * Crear configuración por defecto
 */
const createDefaultConfig = async () => {
  try {
    const config = await WorkAreasConfig.create({
      tituloSeccion: 'Áreas de trabajo',
      activo: true
    });

    const defaultAreas = [
      {
        idConfig: config.idConfig,
        titulo: 'Torneos Provinciales',
        descripcion: 'Organizamos torneos en todas las categorías, promoviendo la competencia a nivel provincial y regional.',
        icono: 'fas fa-trophy',
        orden: 1,
        activo: true
      },
      {
        idConfig: config.idConfig,
        titulo: 'Selecciones Provinciales',
        descripcion: 'Formamos y preparamos las selecciones de Jujuy para representar a nuestra provincia en torneos nacionales.',
        icono: 'fas fa-users',
        orden: 2,
        activo: true
      },
      {
        idConfig: config.idConfig,
        titulo: 'Capacitación Deportiva',
        descripcion: 'Ofrecemos cursos para jugadores, entrenadores y árbitros para mantener el alto nivel del voley jujeño.',
        icono: 'fas fa-graduation-cap',
        orden: 3,
        activo: true
      }
    ];

    await WorkArea.bulkCreate(defaultAreas);

    return await WorkAreasConfig.findOne({
      where: { idConfig: config.idConfig },
      include: [{
        model: WorkArea,
        as: 'WorkAreas',
        where: { activo: true },
        required: false
      }],
      order: [[{ model: WorkArea, as: 'WorkAreas' }, 'orden', 'ASC']]
    });
  } catch (error) {
    console.error('Error creando configuración por defecto:', error);
    throw error;
  }
};

module.exports = {
  getWorkAreasConfig,
  updateWorkAreasConfig,
  deleteWorkArea,
  reorderWorkAreas
}; 