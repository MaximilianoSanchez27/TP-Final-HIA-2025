const { PublicPaymentLink, Cobro, Club } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');

const publicPaymentCtrl = {};

// Función para generar slug único basado en el concepto
const generateSlug = (concepto, id) => {
  const baseSlug = concepto
    .toLowerCase()
    .replace(/[áäàâã]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòôõ]/g, 'o')
    .replace(/[úüùû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  return `${baseSlug}-${id}`;
};

// Generar enlace público para un cobro
publicPaymentCtrl.generatePublicPaymentLink = async (req, res) => {
  try {
    const { cobroId } = req.body;

    if (!cobroId) {
      return res.status(400).json({
        status: "0",
        msg: "El ID del cobro es requerido"
      });
    }

    // Verificar que el cobro existe
    const cobro = await Cobro.findByPk(cobroId, {
      include: [{
        model: Club,
        as: 'club'
      }]
    });

    if (!cobro) {
      return res.status(404).json({
        status: "0",
        msg: "Cobro no encontrado"
      });
    }

    // Verificar que el cobro puede tener enlaces públicos
    if (cobro.estado === 'Pagado' || cobro.estado === 'Anulado') {
      return res.status(400).json({
        status: "0",
        msg: "No se pueden generar enlaces para cobros pagados o anulados"
      });
    }

    // Generar slug único
    const slug = generateSlug(cobro.concepto, cobro.idCobro);
    
    // Verificar que el slug no existe (aunque es muy improbable)
    const existingLink = await PublicPaymentLink.findOne({ where: { slug } });
    if (existingLink) {
      // Si existe, agregar un UUID corto
      const shortUuid = uuidv4().substr(0, 8);
      const finalSlug = `${slug}-${shortUuid}`;
    }

    // Crear el enlace público
    const publicLink = await PublicPaymentLink.create({
      id: uuidv4(),
      cobroId: cobro.idCobro,
      slug: existingLink ? `${slug}-${uuidv4().substr(0, 8)}` : slug,
      isActive: true,
      accessCount: 0
    });

    // Construir URL completa
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const publicUrl = `${baseUrl}/pagar/${publicLink.slug}`;

    res.json({
      status: "1",
      msg: "Enlace público generado exitosamente",
      data: {
        cobro: cobro,
        paymentLink: publicLink,
        publicUrl: publicUrl
      }
    });
  } catch (error) {
    console.error('Error al generar enlace público:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Obtener información de pago público por slug
publicPaymentCtrl.getPublicPaymentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar el enlace público
    const publicLink = await PublicPaymentLink.findOne({
      where: { slug },
      include: [{
        model: Cobro,
        as: 'cobro',
        include: [{
          model: Club,
          as: 'club'
        }]
      }]
    });

    if (!publicLink) {
      return res.status(404).json({
        status: "0",
        msg: "Enlace de pago no encontrado o inválido"
      });
    }

    if (!publicLink.isActive) {
      return res.status(403).json({
        status: "0",
        msg: "Este enlace de pago ha sido desactivado"
      });
    }

    // Verificar si el enlace ha expirado (si tiene fecha de expiración)
    if (publicLink.expirationDate && new Date() > publicLink.expirationDate) {
      return res.status(410).json({
        status: "0",
        msg: "Este enlace de pago ha expirado"
      });
    }

    // Construir URL completa
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const publicUrl = `${baseUrl}/pagar/${publicLink.slug}`;

    res.json({
      status: "1",
      msg: "Información de pago obtenida exitosamente",
      data: {
        cobro: publicLink.cobro,
        paymentLink: publicLink,
        publicUrl: publicUrl
      }
    });
  } catch (error) {
    console.error('Error al obtener pago público:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Incrementar contador de accesos
publicPaymentCtrl.incrementAccessCount = async (req, res) => {
  try {
    const { slug } = req.params;

    const publicLink = await PublicPaymentLink.findOne({
      where: { slug }
    });

    if (!publicLink) {
      return res.status(404).json({
        status: "0",
        msg: "Enlace no encontrado"
      });
    }

    // Incrementar contador
    await publicLink.increment('accessCount');

    res.json({
      status: "1",
      msg: "Contador actualizado",
      data: {
        accessCount: publicLink.accessCount + 1
      }
    });
  } catch (error) {
    console.error('Error al incrementar contador:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Obtener todos los enlaces públicos de un cobro
publicPaymentCtrl.getPublicPaymentLinksForCobro = async (req, res) => {
  try {
    const { cobroId } = req.params;

    const links = await PublicPaymentLink.findAll({
      where: { cobroId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: "1",
      msg: "Enlaces obtenidos exitosamente",
      data: links
    });
  } catch (error) {
    console.error('Error al obtener enlaces:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Activar/desactivar enlace público
publicPaymentCtrl.togglePublicPaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;
    const { isActive } = req.body;

    const publicLink = await PublicPaymentLink.findByPk(linkId);

    if (!publicLink) {
      return res.status(404).json({
        status: "0",
        msg: "Enlace no encontrado"
      });
    }

    await publicLink.update({ isActive });

    res.json({
      status: "1",
      msg: `Enlace ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: publicLink
    });
  } catch (error) {
    console.error('Error al cambiar estado del enlace:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Eliminar enlace público
publicPaymentCtrl.deletePublicPaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    const publicLink = await PublicPaymentLink.findByPk(linkId);

    if (!publicLink) {
      return res.status(404).json({
        status: "0",
        msg: "Enlace no encontrado"
      });
    }

    await publicLink.destroy();

    res.json({
      status: "1",
      msg: "Enlace eliminado exitosamente"
    });
  } catch (error) {
    console.error('Error al eliminar enlace:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

// Obtener estadísticas de pagos públicos
publicPaymentCtrl.getPublicPaymentStats = async (req, res) => {
  try {
    const stats = await PublicPaymentLink.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalLinks'],
        [Sequelize.fn('SUM', Sequelize.col('accessCount')), 'totalAccesses'],
        [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isActive = true THEN 1 END')), 'activeLinks'],
        [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isActive = false THEN 1 END')), 'inactiveLinks']
      ]
    });

    res.json({
      status: "1",
      msg: "Estadísticas obtenidas exitosamente",
      data: stats[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      status: "0",
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};

module.exports = publicPaymentCtrl; 