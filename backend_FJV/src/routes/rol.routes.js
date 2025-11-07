const express = require('express');
const router = express.Router();
const Rol = require('../models/Rol');

// Obtener todos los roles
router.get('/', async (req, res) => {
    try {
        const roles = await Rol.findAll();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Crear un nuevo rol
router.post('/', async (req, res) => {
    try {
        const nuevoRol = await Rol.create(req.body);
        res.status(201).json(nuevoRol);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Exportar el router
module.exports = router;