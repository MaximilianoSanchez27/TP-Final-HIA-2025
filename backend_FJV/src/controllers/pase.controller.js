const Pase = require("../models/Pase");
const Persona = require("../models/Persona");
const Club = require("../models/Club");
const { Op } = require("sequelize");

const paseCtrl = {};

/**
 * Obtener todos los pases con información de persona y clubes
 */
paseCtrl.getPases = async (req, res) => {
  try {
    const pases = await Pase.findAll({
      include: [
        {
          model: Persona,
          as: "persona",
          attributes: ["idPersona", "nombreApellido", "dni"]
        },
        {
          model: Club,
          as: "clubOrigenRelacion",
          attributes: ["idClub", "nombre"],
          required: false
        },
        {
          model: Club,
          as: "clubDestinoRelacion",
          attributes: ["idClub", "nombre"]
        }
      ],
      order: [["fechaPase", "DESC"]]
    });

    res.status(200).json(pases);
  } catch (error) {
    console.error("Error en getPases:", error);
    res.status(500).json({
      status: "0",
      msg: "Error procesando la operación.",
      error: error.message,
    });
  }
};

/**
 * Obtener pases de una persona específica
 */
paseCtrl.getPasesByPersona = async (req, res) => {
  try {
    const { idPersona } = req.params;
    
    const pases = await Pase.findAll({
      where: { idPersona },
      include: [
        {
          model: Persona,
          as: "persona",
          attributes: ["idPersona", "nombreApellido", "dni"]
        },
        {
          model: Club,
          as: "clubOrigenRelacion",
          attributes: ["idClub", "nombre"],
          required: false
        },
        {
          model: Club,
          as: "clubDestinoRelacion",
          attributes: ["idClub", "nombre"]
        }
      ],
      order: [["fechaPase", "DESC"]]
    });

    res.status(200).json(pases);
  } catch (error) {
    console.error("Error en getPasesByPersona:", error);
    res.status(500).json({
      status: "0",
      msg: "Error procesando la operación.",
      error: error.message,
    });
  }
};

/**
 * Obtener pases de un club específico
 */
paseCtrl.getPasesByClub = async (req, res) => {
  try {
    const { idClub } = req.params;
    const { tipo = 'todos' } = req.query; // 'provenientes', 'destino', 'todos'
    
    let whereClause = {};
    
    if (tipo === 'provenientes') {
      whereClause.idClubProveniente = idClub;
    } else if (tipo === 'destino') {
      whereClause.idClubDestino = idClub;
    } else {
      whereClause[Op.or] = [
        { idClubProveniente: idClub },
        { idClubDestino: idClub }
      ];
    }

    const pases = await Pase.findAll({
      where: whereClause,
      include: [
        {
          model: Persona,
          as: "persona",
          attributes: ["idPersona", "nombreApellido", "dni"]
        },
        {
          model: Club,
          as: "clubOrigenRelacion",
          attributes: ["idClub", "nombre"],
          required: false
        },
        {
          model: Club,
          as: "clubDestinoRelacion",
          attributes: ["idClub", "nombre"]
        }
      ],
      order: [["fechaPase", "DESC"]]
    });

    res.status(200).json(pases);
  } catch (error) {
    console.error("Error en getPasesByClub:", error);
    res.status(500).json({
      status: "0",
      msg: "Error procesando la operación.",
      error: error.message,
    });
  }
};

/**
 * Crear un nuevo pase
 */
paseCtrl.createPase = async (req, res) => {
  try {
    console.log("Creando nuevo pase con datos:", req.body);

    const paseData = { ...req.body };
    
    // Validar que la persona existe
    const persona = await Persona.findByPk(paseData.idPersona);
    if (!persona) {
      return res.status(404).json({
        status: "0",
        msg: "Persona no encontrada.",
      });
    }

    // VALIDACIÓN OBLIGATORIA: El club destino debe existir
    if (!paseData.clubDestino || paseData.clubDestino.trim() === '') {
      return res.status(400).json({
        status: "0",
        msg: "Club destino es obligatorio.",
      });
    }

    // Buscar el club destino por nombre
    let clubDestino = null;
    if (paseData.idClubDestino) {
      // Si se proporciona ID, validar que exista
      clubDestino = await Club.findByPk(paseData.idClubDestino);
    } else {
      // Si no se proporciona ID, buscar por nombre
      clubDestino = await Club.findOne({
        where: { nombre: paseData.clubDestino.trim() }
      });
    }

    if (!clubDestino) {
      return res.status(400).json({
        status: "0",
        msg: `El club destino "${paseData.clubDestino}" no existe en el sistema. Debe seleccionar un club registrado.`,
      });
    }

    // Asegurar que tenemos el ID del club destino
    paseData.idClubDestino = clubDestino.idClub;
    paseData.clubDestino = clubDestino.nombre; // Normalizar el nombre

    // Validar club proveniente si se proporciona
    if (paseData.clubProveniente && paseData.clubProveniente.trim() !== '') {
      let clubProveniente = null;
      if (paseData.idClubProveniente) {
        clubProveniente = await Club.findByPk(paseData.idClubProveniente);
      } else {
        clubProveniente = await Club.findOne({
          where: { nombre: paseData.clubProveniente.trim() }
        });
      }

      if (!clubProveniente) {
        return res.status(400).json({
          status: "0",
          msg: `El club proveniente "${paseData.clubProveniente}" no existe en el sistema.`,
        });
      }

      paseData.idClubProveniente = clubProveniente.idClub;
      paseData.clubProveniente = clubProveniente.nombre; // Normalizar el nombre
    }

    // Validar que no sea el mismo club
    if (paseData.idClubProveniente === paseData.idClubDestino) {
      return res.status(400).json({
        status: "0",
        msg: "El club proveniente y destino no pueden ser el mismo.",
      });
    }

    // Crear el pase
    const pase = await Pase.create(paseData);

    await persona.update({
      clubActual: clubDestino.nombre
    });

    // Obtener el pase completo con las relaciones
    const paseCompleto = await Pase.findByPk(pase.idPase, {
      include: [
        {
          model: Persona,
          as: "persona",
          attributes: ["idPersona", "nombreApellido", "dni"]
        },
        {
          model: Club,
          as: "clubOrigenRelacion",
          attributes: ["idClub", "nombre"],
          required: false
        },
        {
          model: Club,
          as: "clubDestinoRelacion",
          attributes: ["idClub", "nombre"]
        }
      ]
    });

    res.status(201).json({
      status: "1",
      msg: "Pase registrado con éxito",
      pase: paseCompleto,
    });
  } catch (error) {
    console.error("Error en createPase:", error);
    res.status(500).json({
      status: "0",
      msg: "Error al registrar el pase",
      error: error.message,
    });
  }
};

/**
 * Actualizar estado de habilitación de un pase
 */
paseCtrl.updateHabilitacion = async (req, res) => {
  try {
    const { idPase } = req.params;
    const { habilitacion, observaciones } = req.body;

    const pase = await Pase.findByPk(idPase);
    if (!pase) {
      return res.status(404).json({
        status: "0",
        msg: "Pase no encontrado.",
      });
    }

    await pase.update({
      habilitacion,
      observaciones: observaciones || pase.observaciones
    });

    const paseActualizado = await Pase.findByPk(idPase, {
      include: [
        {
          model: Persona,
          as: "persona",
          attributes: ["idPersona", "nombreApellido", "dni"]
        },
        {
          model: Club,
          as: "clubOrigenRelacion",
          attributes: ["idClub", "nombre"],
          required: false
        },
        {
          model: Club,
          as: "clubDestinoRelacion",
          attributes: ["idClub", "nombre"]
        }
      ]
    });

    res.status(200).json({
      status: "1",
      msg: "Pase actualizado con éxito",
      pase: paseActualizado,
    });
  } catch (error) {
    console.error("Error en updateHabilitacion:", error);
    res.status(500).json({
      status: "0",
      msg: "Error al actualizar el pase",
      error: error.message,
    });
  }
};

/**
 * Función auxiliar para registrar un pase automáticamente
 * Esta función se llama desde el controlador de personas cuando se actualiza el club
 */
paseCtrl.registrarPaseAutomatico = async (idPersona, clubAnterior, idClubAnterior, clubNuevo, idClubNuevo, datosAfiliado = null) => {
  try {
    // Verificar si ya existe un pase similar en el día actual
    const fechaHoy = new Date().toISOString().split('T')[0];
    const paseExistente = await Pase.findOne({
      where: {
        idPersona,
        clubDestino: clubNuevo,
        fechaPase: fechaHoy
      }
    });

    if (paseExistente) {
      console.log(`⚠️ Ya existe un pase para hoy de ${clubAnterior || 'Sin club'} → ${clubNuevo} para persona ${idPersona}`);
      return paseExistente;
    }

    const paseData = {
      idPersona,
      clubProveniente: clubAnterior,
      idClubProveniente: idClubAnterior,
      clubDestino: clubNuevo,
      idClubDestino: idClubNuevo,
      fechaPase: fechaHoy,
      habilitacion: 'HABILITADO', // Auto-habilitado para pases desde el formulario
      motivo: 'Cambio de club desde formulario de afiliado',
      datosAfiliado: datosAfiliado ? JSON.stringify(datosAfiliado) : null
    };

    const pase = await Pase.create(paseData);
    console.log(`✅ Pase registrado automáticamente: ${clubAnterior || 'Sin club'} → ${clubNuevo} para persona ${idPersona}`);
    
    return pase;
  } catch (error) {
    console.error("Error al registrar pase automático:", error);
    throw error;
  }
};

module.exports = paseCtrl; 