const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const { enviarEmailRecuperacion } = require('../services/emailService');

const TOKEN_EXPIRA_MINUTOS = 15;

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'El email es requerido' });
  }

  // Respuesta genérica: no revelamos si el email existe o no (seguridad)
  const respuestaGenerica = {
    mensaje: 'Si el email está registrado, vas a recibir un código de recuperación.',
  };

  try {
    const usuario = await userModel.findUserForReset(email);

    if (!usuario) {
      return res.status(200).json(respuestaGenerica);
    }

    const codigo = crypto.randomInt(100000, 999999).toString();
    const codigoHasheado = await bcrypt.hash(codigo, 10);
    const expira = new Date(Date.now() + TOKEN_EXPIRA_MINUTOS * 60 * 1000);

    await userModel.setResetToken(usuario.id, codigoHasheado, expira);
    await enviarEmailRecuperacion(usuario.email, codigo);

    return res.status(200).json(respuestaGenerica);
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { email, codigo, nuevaContrasena }
 */
async function resetPassword(req, res) {
  const { email, codigo, nuevaContrasena } = req.body;

  if (!email || !codigo || !nuevaContrasena) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  if (nuevaContrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const usuario = await userModel.findUserForReset(email);

    if (!usuario || !usuario.reset_token || !usuario.reset_token_expira) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    if (new Date() > new Date(usuario.reset_token_expira)) {
      return res.status(400).json({ error: 'El código expiró, solicitá uno nuevo' });
    }

    const codigoValido = await bcrypt.compare(codigo, usuario.reset_token);
    if (!codigoValido) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const passwordHash = await bcrypt.hash(nuevaContrasena, 10);
    await userModel.updatePasswordAndClearReset(usuario.id, passwordHash);

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

module.exports = { forgotPassword, resetPassword };
