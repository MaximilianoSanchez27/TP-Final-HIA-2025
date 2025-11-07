const express = require('express');
const router = express.Router();
const { 
    filtrarAfiliadosAvanzado, 
    obtenerOpcionesFiltros, 
    guardarConfiguracionFiltro,
    exportarAfiliadosExcel,
    poblarDatosPrueba
} = require('../controllers/afiliadosController');

// Ruta principal para filtros avanzados
router.get('/filtros-avanzados', filtrarAfiliadosAvanzado);

// Ruta para obtener opciones de filtros (valores únicos)
router.get('/opciones-filtros', obtenerOpcionesFiltros);

// Ruta para guardar configuraciones de filtros
router.post('/configuraciones-filtro', guardarConfiguracionFiltro);

// Ruta para poblar datos de prueba (solo desarrollo)
router.post('/poblar-datos-prueba', poblarDatosPrueba);

// Ruta específica para exportar a Excel
router.get('/exportar-excel', (req, res) => {
    req.query.exportToExcel = 'true';
    filtrarAfiliadosAvanzado(req, res);
});

module.exports = router; 