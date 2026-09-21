const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// POST /incidents — Reportar un incidente nuevo
router.post('/', incidentController.reportIncident);

// GET /incidents — Listar incidentes vigentes (últimas 24hs)
router.get('/', incidentController.listIncidents);

// DELETE /incidents/:id — Eliminar un incidente propio
router.delete('/:id', incidentController.removeIncident);

module.exports = router;