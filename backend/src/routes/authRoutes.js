const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/register - Registro de nuevo usuario
router.post('/register', authController.register);

// POST /auth/login - Inicio de sesión
router.post('/login', authController.login);

module.exports = router;
