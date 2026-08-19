const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Protege todas las rutas de /routes exigiendo token JWT válido
router.use(authenticateToken);

// POST /routes/start — Iniciar un nuevo recorrido
router.post('/start', routeController.start);

// POST /routes/:id/points — Enviar y acumular puntos GPS
router.post('/:id/points', routeController.addPoints);

// POST /routes/:id/finish — Finalizar recorrido y consolidar geometría PostGIS
router.post('/:id/finish', routeController.finish);

// GET /routes — Listar recorridos del usuario en GeoJSON
router.get('/', routeController.listRoutes);

// GET /routes/stats/summary — Estadísticas del usuario
router.get('/stats/summary', routeController.getStatsSummary);

// GET /routes/:id — Ver detalle de un recorrido específico en GeoJSON
router.get('/:id', routeController.getRouteById);

module.exports = router;
