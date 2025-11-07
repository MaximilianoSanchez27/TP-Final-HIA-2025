const express = require('express');
const router = express.Router();
const paseCtrl = require('../controllers/pase.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Pase:
 *       type: object
 *       required:
 *         - idPersona
 *         - idClubDestino
 *         - clubDestino
 *       properties:
 *         idPase:
 *           type: integer
 *           description: ID único del pase
 *         idPersona:
 *           type: integer
 *           description: ID de la persona que realiza el pase
 *         clubProveniente:
 *           type: string
 *           description: Nombre del club de origen
 *         idClubProveniente:
 *           type: integer
 *           description: ID del club de origen
 *         clubDestino:
 *           type: string
 *           description: Nombre del club de destino
 *         idClubDestino:
 *           type: integer
 *           description: ID del club de destino
 *         fechaPase:
 *           type: string
 *           format: date
 *           description: Fecha del pase
 *         habilitacion:
 *           type: string
 *           enum: [HABILITADO, PENDIENTE, RECHAZADO]
 *           description: Estado de habilitación del pase
 *         motivo:
 *           type: string
 *           description: Motivo del pase
 *         observaciones:
 *           type: string
 *           description: Observaciones adicionales
 *         datosAfiliado:
 *           type: object
 *           description: Datos del afiliado al momento del pase
 */

/**
 * @swagger
 * /api/pases:
 *   get:
 *     summary: Obtener todos los pases
 *     tags: [Pases]
 *     responses:
 *       200:
 *         description: Lista de pases obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pase'
 */
router.get('/', paseCtrl.getPases);

/**
 * @swagger
 * /api/pases/persona/{idPersona}:
 *   get:
 *     summary: Obtener pases de una persona específica
 *     tags: [Pases]
 *     parameters:
 *       - in: path
 *         name: idPersona
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la persona
 *     responses:
 *       200:
 *         description: Pases de la persona obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pase'
 */
router.get('/persona/:idPersona', paseCtrl.getPasesByPersona);

/**
 * @swagger
 * /api/pases/club/{idClub}:
 *   get:
 *     summary: Obtener pases de un club específico
 *     tags: [Pases]
 *     parameters:
 *       - in: path
 *         name: idClub
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del club
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [provenientes, destino, todos]
 *         description: Tipo de pases a obtener
 *     responses:
 *       200:
 *         description: Pases del club obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pase'
 */
router.get('/club/:idClub', paseCtrl.getPasesByClub);

/**
 * @swagger
 * /api/pases:
 *   post:
 *     summary: Crear un nuevo pase
 *     tags: [Pases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pase'
 *     responses:
 *       201:
 *         description: Pase creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 msg:
 *                   type: string
 *                 pase:
 *                   $ref: '#/components/schemas/Pase'
 */
router.post('/', paseCtrl.createPase);

/**
 * @swagger
 * /api/pases/{idPase}/habilitacion:
 *   put:
 *     summary: Actualizar estado de habilitación de un pase
 *     tags: [Pases]
 *     parameters:
 *       - in: path
 *         name: idPase
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               habilitacion:
 *                 type: string
 *                 enum: [HABILITADO, PENDIENTE, RECHAZADO]
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pase actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 msg:
 *                   type: string
 *                 pase:
 *                   $ref: '#/components/schemas/Pase'
 */
router.put('/:idPase/habilitacion', paseCtrl.updateHabilitacion);

module.exports = router; 