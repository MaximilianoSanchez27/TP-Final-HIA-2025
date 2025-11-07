const express = require("express");
const router = express.Router();
const categoriaCtrl = require("../controllers/categoria.controller");
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Proteger todas las rutas de categoría - solo administradores
router.use(authenticate, authorize('admin'));

router.get("/", categoriaCtrl.getCategorias);
router.post("/", categoriaCtrl.createCategoria);
router.get("/:id", categoriaCtrl.getCategoria);
router.put("/:id", categoriaCtrl.editCategoria);
router.delete("/:id", categoriaCtrl.deleteCategoria);

// Ruta adicional para el filtrado de categorías
router.get("/filter/search", categoriaCtrl.getCategoriasFiltradas);

module.exports = router;