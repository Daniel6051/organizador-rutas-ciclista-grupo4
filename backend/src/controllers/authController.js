const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback_key';
const JWT_EXPIRES_IN = '7d';

/**
 * Genera un token JWT para el usuario autenticado
 * @param {Object} user - { id, email }
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Registro de un nuevo usuario
 * POST /auth/register
 */
async function register(req, res) {
  try {
    const { email, nombre, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = (nombre || '').trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await userModel.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya se encuentra registrado' });
    }

    // Hashear contraseña con bcrypt (10 rondas de salteo)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario en base de datos
    const createdUser = await userModel.createUser({
      email: cleanEmail,
      nombre: cleanNombre,
      passwordHash,
    });

    const userPayload = {
      id: createdUser.id,
      email: createdUser.email,
      nombre: createdUser.nombre,
    };

    const token = generateToken(userPayload);

    return res.status(201).json({
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error('Error en /auth/register:', error);
    return res.status(500).json({ error: 'Error interno del servidor al registrar el usuario' });
  }
}

/**
 * Inicio de sesión de usuario
 * POST /auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Buscar usuario por email
    const user = await userModel.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Comparar contraseña con el hash almacenado
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
    };

    const token = generateToken(userPayload);

    return res.json({
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
}

module.exports = {
  register,
  login,
};
