const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Guardar token de dispositivo (FCM)
router.post('/device-token', authenticateToken, userController.saveDeviceToken);

module.exports = router;
