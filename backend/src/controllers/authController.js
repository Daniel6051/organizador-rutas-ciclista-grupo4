const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback_key';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Genera el access token (corta duración) para el usuario autenticado
 * @param {Object} user - { id, email }
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

/**
 * Genera el refresh token (larga duración). Solo lleva el id del usuario.
 * @param {Object} user - { id }
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * Genera un par access token + refresh token, y persiste el hash
 * del refresh token en la base de datos para poder validarlo/revocarlo después.
 * @param {Object} userPayload - { id, email, nombre }
 */
async function emitirTokens(userPayload) {
  const token = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken(userPayload);

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  const expira = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  await userModel.setRefreshToken(userPayload.id, refreshTokenHash, expira);

  return { token, refreshToken };
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

    const { token, refreshToken } = await emitirTokens(userPayload);

    return res.status(201).json({
      user: userPayload,
      token,
      refreshToken,
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

    const { token, refreshToken } = await emitirTokens(userPayload);

    return res.json({
      user: userPayload,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
}

/**
 * Renueva el access token usando un refresh token válido.
 * También rota el refresh token (se invalida el viejo y se emite uno nuevo).
 * POST /auth/refresh-token
 * Body: { refreshToken }
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken: tokenRecibido } = req.body;

    if (!tokenRecibido) {
      return res.status(400).json({ error: 'refreshToken es requerido' });
    }

    let payload;
    try {
      payload = jwt.verify(tokenRecibido, JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const usuario = await userModel.findUserForRefresh(payload.id);

    if (!usuario || !usuario.refresh_token_hash || !usuario.refresh_token_expira) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    if (new Date() > new Date(usuario.refresh_token_expira)) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const coincide = await bcrypt.compare(tokenRecibido, usuario.refresh_token_hash);
    if (!coincide) {
      // El token no coincide con el último emitido (pudo haber sido rotado
      // o revocado) -> se rechaza por seguridad.
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const userPayload = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
    };

    // Rotación: se invalida el refresh token usado y se emite uno nuevo
    const { token: nuevoToken, refreshToken: nuevoRefreshToken } = await emitirTokens(userPayload);

    return res.json({
      token: nuevoToken,
      refreshToken: nuevoRefreshToken,
    });
  } catch (error) {
    console.error('Error en /auth/refresh-token:', error);
    return res.status(500).json({ error: 'Error interno del servidor al renovar el token' });
  }
}

/**
 * Cierra la sesión invalidando el refresh token guardado.
 * POST /auth/logout
 * Requiere authenticateToken (usa req.user.id)
 */
async function logout(req, res) {
  try {
    await userModel.clearRefreshToken(req.user.id);
    return res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en /auth/logout:', error);
    return res.status(500).json({ error: 'Error interno del servidor al cerrar sesión' });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
