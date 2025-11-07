const express = require("express");
const router = express.Router();
const equipoCtrl = require("../controllers/equipo.controller");

router.get("/filter", equipoCtrl.getEquipoFiltro);
router.get("/", equipoCtrl.getEquipos);
router.post("/", equipoCtrl.createEquipo);
router.get("/:id", equipoCtrl.getEquipo);
router.put("/:id", equipoCtrl.editEquipo);
router.delete("/:id", equipoCtrl.deleteEquipo);

module.exports = router;