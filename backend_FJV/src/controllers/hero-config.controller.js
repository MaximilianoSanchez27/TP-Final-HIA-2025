const { HeroConfig, HeroImage } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de archivos en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'));
    }
  }
});

// API Key de ImgBB desde variables de entorno
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

/**
 * Sube una imagen a ImgBB desde el backend
 */
const uploadToImgBB = async (imageBuffer, filename) => {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, filename);

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.success) {
      return response.data.data.url;
    } else {
      throw new Error('Error uploading to ImgBB');
    }
  } catch (error) {
    console.error('Error uploading to ImgBB:', error.message);
    throw error;
  }
};

/**
 * Obtener la configuración actual del hero
 * @route GET /api/hero-config
 * @access Public
 */
const getHeroConfig = async (req, res) => {
  try {
    let heroConfig = await HeroConfig.findOne({
      where: { activo: true },
      include: [{
        model: HeroImage,
        as: 'imagenes',
        where: { activo: true },
        required: false,
        order: [['orden', 'ASC']]
      }],
      order: [['fechaActualizacion', 'DESC']]
    });

    // Si no existe configuración, crear una por defecto
    if (!heroConfig) {
      heroConfig = await HeroConfig.create({
        eslogan: 'Pasión por el Voleibol',
        subTexto: 'Promoviendo el voleibol en la provincia de Jujuy desde sus bases',
        activo: true
      });

      // Crear imagen por defecto
      await HeroImage.create({
        idConfig: heroConfig.idConfig,
        url: 'assets/images/volleyball-hero.png',
        alt: 'Voleibol en acción',
        orden: 1,
        activo: true
      });

      // Recargar la configuración con imágenes
      heroConfig = await HeroConfig.findByPk(heroConfig.idConfig, {
        include: [{
          model: HeroImage,
          as: 'imagenes',
          where: { activo: true },
          required: false,
          order: [['orden', 'ASC']]
        }]
      });
    }

    res.json({
      status: '1',
      msg: 'Configuración del hero obtenida exitosamente',
      data: heroConfig
    });

  } catch (error) {
    console.error('Error al obtener configuración del hero:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Actualizar la configuración del hero (solo eslogan y subtexto)
 * @route PUT /api/hero-config
 * @access Private (Admin only)
 */
const updateHeroConfig = async (req, res) => {
  try {
    const { eslogan, subTexto } = req.body;

    // Validaciones básicas
    if (!eslogan || !subTexto) {
      return res.status(400).json({
        status: '0',
        msg: 'El eslogan y subtexto son requeridos'
      });
    }

    // Buscar configuración activa o crear nueva
    let heroConfig = await HeroConfig.findOne({
      where: { activo: true }
    });

    if (heroConfig) {
      // Actualizar configuración existente
      await heroConfig.update({
        eslogan,
        subTexto,
        fechaActualizacion: new Date()
      });
    } else {
      // Crear nueva configuración
      heroConfig = await HeroConfig.create({
        eslogan,
        subTexto,
        activo: true
      });
    }

    // Obtener configuración actualizada con imágenes
    const configActualizada = await HeroConfig.findByPk(heroConfig.idConfig, {
      include: [{
        model: HeroImage,
        as: 'imagenes',
        where: { activo: true },
        required: false,
        order: [['orden', 'ASC']]
      }]
    });

    res.json({
      status: '1',
      msg: 'Configuración del hero actualizada exitosamente',
      data: configActualizada
    });

  } catch (error) {
    console.error('Error al actualizar configuración del hero:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Eliminar una imagen específica del carousel
 * @route DELETE /api/hero-config/images/:id
 * @access Private (Admin only)
 */
const deleteHeroImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar la imagen
    const imagen = await HeroImage.findByPk(id);
    if (!imagen) {
      return res.status(404).json({
        status: '0',
        msg: 'Imagen no encontrada'
      });
    }

    // Verificar que la imagen pertenece a una configuración activa
    const heroConfig = await HeroConfig.findOne({
      where: { 
        idConfig: imagen.idConfig,
        activo: true 
      }
    });

    if (!heroConfig) {
      return res.status(404).json({
        status: '0',
        msg: 'Configuración del hero no encontrada'
      });
    }

    // Obtener el orden de la imagen a eliminar
    const ordenEliminado = imagen.orden;

    // Eliminar la imagen (marcar como inactiva)
    await imagen.update({ activo: false });

    // Actualizar el orden de las imágenes restantes
    await HeroImage.update(
      { orden: HeroImage.sequelize.literal('orden - 1') },
      {
        where: {
          idConfig: imagen.idConfig,
          activo: true,
          orden: { [Op.gt]: ordenEliminado }
        }
      }
    );

    // Obtener configuración actualizada con imágenes
    const configActualizada = await HeroConfig.findByPk(heroConfig.idConfig, {
      include: [{
        model: HeroImage,
        as: 'imagenes',
        where: { activo: true },
        required: false,
        order: [['orden', 'ASC']]
      }]
    });

    res.json({
      status: '1',
      msg: 'Imagen eliminada exitosamente',
      data: configActualizada
    });

  } catch (error) {
    console.error('Error al eliminar imagen del hero:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Reordenar las imágenes del carousel
 * @route PUT /api/hero-config/reorder
 * @access Private (Admin only)
 */
const reorderImages = async (req, res) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds)) {
      return res.status(400).json({
        status: '0',
        msg: 'Se requiere un array de IDs de imágenes'
      });
    }

    // Actualizar el orden de cada imagen
    for (let i = 0; i < imageIds.length; i++) {
      await HeroImage.update(
        { orden: i + 1 },
        { where: { idImagen: imageIds[i] } }
      );
    }

    res.json({
      status: '1',
      msg: 'Orden de imágenes actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al reordenar imágenes:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Subir imágenes a ImgBB
 * @route POST /api/hero-config/upload
 * @access Private (Admin only)
 */
const uploadImages = async (req, res) => {
  try {
    // Verificar que la API key de ImgBB esté configurada
    if (!IMGBB_API_KEY) {
      return res.status(500).json({
        status: '0',
        msg: 'API Key de ImgBB no configurada. Contacte al administrador del sistema.'
      });
    }

    // Verificar que se subieron archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: '0',
        msg: 'No se han proporcionado imágenes para subir'
      });
    }

    // Validar número máximo de imágenes
    if (req.files.length > 5) {
      return res.status(400).json({
        status: '0',
        msg: 'Máximo 5 imágenes permitidas'
      });
    }

    console.log('Files received:', req.files.length);
    console.log('Files details:', req.files.map(f => ({ 
      originalname: f.originalname, 
      mimetype: f.mimetype, 
      size: f.size 
    })));

    // Subir todas las imágenes a ImgBB
    const imagenesSubidas = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        console.log(`Subiendo imagen ${i + 1}: ${file.originalname}`);
        const imageUrl = await uploadToImgBB(file.buffer, file.originalname);
        console.log(`Imagen ${i + 1} subida exitosamente: ${imageUrl}`);
        
        imagenesSubidas.push({
          url: imageUrl,
          alt: `Imagen del carousel ${i + 1}`,
          orden: i + 1,
          activo: true,
          nombreOriginal: file.originalname
        });
      } catch (uploadError) {
        console.error(`Error subiendo ${file.originalname}:`, uploadError);
        return res.status(500).json({
          status: '0',
          msg: `Error subiendo la imagen ${file.originalname}: ${uploadError.message}`,
          error: uploadError.message
        });
      }
    }

    res.json({
      status: '1',
      msg: `${imagenesSubidas.length} imágenes subidas exitosamente a ImgBB`,
      data: imagenesSubidas
    });

  } catch (error) {
    console.error('Error en uploadImages:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Agregar nuevas imágenes al carousel (sin reemplazar las existentes)
 * @route POST /api/hero-config/add-images
 * @access Private (Admin only)
 */
const addImages = async (req, res) => {
  try {
    const { imagenes } = req.body;

    if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
      return res.status(400).json({
        status: '0',
        msg: 'Se requiere al menos una imagen'
      });
    }

    // Buscar configuración activa
    let heroConfig = await HeroConfig.findOne({
      where: { activo: true }
    });

    if (!heroConfig) {
      // Crear configuración por defecto si no existe
      heroConfig = await HeroConfig.create({
        eslogan: 'Pasión por el Voleibol',
        subTexto: 'Promoviendo el voleibol en la provincia de Jujuy desde sus bases',
        activo: true
      });
    }

    // Obtener el siguiente número de orden
    const maxOrden = await HeroImage.max('orden', {
      where: { 
        idConfig: heroConfig.idConfig,
        activo: true 
      }
    }) || 0;

    // Crear nuevas imágenes
    const nuevasImagenes = imagenes.map((imagen, index) => ({
      idConfig: heroConfig.idConfig,
      url: imagen.url,
      alt: imagen.alt || `Imagen del carousel ${maxOrden + index + 1}`,
      orden: maxOrden + index + 1,
      activo: true
    }));

    await HeroImage.bulkCreate(nuevasImagenes);

    // Obtener configuración actualizada con todas las imágenes
    const configActualizada = await HeroConfig.findByPk(heroConfig.idConfig, {
      include: [{
        model: HeroImage,
        as: 'imagenes',
        where: { activo: true },
        required: false,
        order: [['orden', 'ASC']]
      }]
    });

    res.json({
      status: '1',
      msg: 'Imágenes agregadas exitosamente',
      data: configActualizada
    });

  } catch (error) {
    console.error('Error al agregar imágenes:', error);
    res.status(500).json({
      status: '0',
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getHeroConfig,
  updateHeroConfig,
  deleteHeroImage,
  reorderImages,
  upload,
  uploadImages,
  addImages
}; 