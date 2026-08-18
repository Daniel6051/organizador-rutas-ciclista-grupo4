const express = require('express');
const router = express.Router();
const bikeController = require('../controllers/bikeController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Protege todas las rutas de /bikes exigiendo token JWT válido
router.use(authenticateToken);

// GET /bikes — Listar bicicletas del usuario autenticado
router.get('/', bikeController.listBikes);

// POST /bikes — Crear una nueva bicicleta asociada al usuario
router.post('/', bikeController.createBike);

// GET /bikes/:id — Ver el detalle de una bicicleta específica
router.get('/:id', bikeController.getBikeById);

// PUT /bikes/:id — Editar los datos de una bicicleta
router.put('/:id', bikeController.updateBike);

// DELETE /bikes/:id — Eliminar una bicicleta
router.delete('/:id', bikeController.deleteBike);

// GET /bikes/:id/maintenance — Estado de mantenimiento de una bicicleta
router.get('/:id/maintenance', bikeController.getBikeMaintenance);

module.exports = router;
