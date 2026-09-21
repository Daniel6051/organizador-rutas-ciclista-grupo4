const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Guardar token de dispositivo (FCM)
router.post('/device-token', authenticateToken, userController.saveDeviceToken);

// Perfil: cambiar nombre y contraseña del usuario autenticado
router.put('/me', authenticateToken, userController.updateProfile);
router.put('/me/password', authenticateToken, userController.changePassword);

module.exports = router;