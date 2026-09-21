const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Mínimo 8 caracteres, una mayúscula, un número y un símbolo
// (misma regla que valida la app en el registro)
const PASSWORD_FUERTE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const NOMBRE_MAX = 60;

/**
 * Endpoint para guardar el token de Firebase Cloud Messaging del dispositivo del usuario.
 * POST /users/device-token
 * Body esperado (mock contract): { userId, token }
 * NOTA: Priorizamos actualizar el usuario logueado en req.user.id por seguridad,
 * pero si el mock no pasa Authorization, podríamos fallar. Asumimos que viene con JWT.
 */
async function saveDeviceToken(req, res) {
  try {
    const { token } = req.body;
    const userId = req.user.id; // Del middleware de autenticación

    if (!token) {
      return res.status(400).json({ error: 'Falta proveer el token (fcm_token)' });
    }

    const query = `
      UPDATE users 
      SET fcm_token = $1 
      WHERE id = $2 
      RETURNING id, email;
    `;
    const { rows } = await db.query(query, [token, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Retorno basado en el contrato exacto del mock
    return res.json({ 
      ok: true, 
      userId: userId, 
      tokenGuardado: true 
    });
  } catch (error) {
    console.error('Error guardando device token:', error);
    return res.status(500).json({ error: 'Error interno guardando el token' });
  }
}

/**
 * Actualiza el nombre del usuario autenticado
 * PUT /users/me
 * Body: { nombre }
 */
async function updateProfile(req, res) {
  try {
    const { nombre } = req.body;

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    }

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length > NOMBRE_MAX) {
      return res.status(400).json({ error: `El nombre no puede superar los ${NOMBRE_MAX} caracteres` });
    }

    const { rows } = await db.query(
      'UPDATE users SET nombre = $1 WHERE id = $2 RETURNING id, email, nombre',
      [nombreLimpio, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Misma forma de "user" que devuelve el login
    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil' });
  }
}

/**
 * Cambia la contraseña del usuario autenticado
 * PUT /users/me/password
 * Body: { passwordActual, passwordNueva }
 * OJO: la contraseña actual incorrecta responde 400 y NO 401, porque el
 * request() de la app interpreta un 401 como token vencido e intenta
 * renovar la sesión (y podría cerrarla).
 */
async function changePassword(req, res) {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'passwordActual y passwordNueva son requeridas' });
    }

    if (!PASSWORD_FUERTE.test(passwordNueva)) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener 8+ caracteres, una mayúscula, un número y un símbolo',
      });
    }

    if (passwordActual === passwordNueva) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' });
    }

    const { rows } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!coincide) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [nuevoHash, req.user.id]);

    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en changePassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor al cambiar la contraseña' });
  }
}

module.exports = {
  saveDeviceToken,
  updateProfile,
  changePassword,
};
