const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /auth/register - Registro de nuevo usuario
router.post('/register', authController.register);

// POST /auth/login - Inicio de sesión
router.post('/login', authController.login);

// POST /auth/refresh-token - Renueva el access token usando el refresh token
router.post('/refresh-token', authController.refreshToken);

// POST /auth/logout - Cierra sesión e invalida el refresh token guardado
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;