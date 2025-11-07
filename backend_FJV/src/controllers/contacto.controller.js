const Contacto = require('../models/Contacto');

const contactoCtrl = {};

// Obtener el único contacto
contactoCtrl.getContacto = async (req, res) => {
  try {
    const contacto = await Contacto.findOne();
    if (!contacto) {
      return res.status(404).json({ msg: 'No hay datos de contacto disponibles' });
    }
    res.status(200).json(contacto);
  } catch (error) {
    console.error('Error al obtener contacto:', error);
    res.status(500).json({ msg: 'Error al obtener contacto', error: error.message });
  }
};

// Crear un contacto (solo si no existe uno)
contactoCtrl.createContacto = async (req, res) => {
  try {
    const existente = await Contacto.findOne();
    if (existente) {
      return res.status(400).json({ msg: 'Ya existe un contacto, no se puede crear otro' });
    }

    const nuevoContacto = await Contacto.create(req.body);
    res.status(201).json(nuevoContacto);
  } catch (error) {
    console.error('Error al crear contacto:', error);
    res.status(500).json({ msg: 'Error al crear contacto', error: error.message });
  }
};

// Actualizar el contacto (si no existe, lo crea)
contactoCtrl.updateContacto = async (req, res) => {
  try {
    let contacto = await Contacto.findOne();

    if (!contacto) {
      contacto = await Contacto.create(req.body);
      return res.status(201).json({ msg: 'Contacto creado correctamente', contacto });
    }

    await contacto.update(req.body);
    res.status(200).json({ msg: 'Contacto actualizado correctamente', contacto });
  } catch (error) {
    console.error('Error al actualizar contacto:', error);
    res.status(500).json({ msg: 'Error al actualizar contacto', error: error.message });
  }
};

module.exports = contactoCtrl;
