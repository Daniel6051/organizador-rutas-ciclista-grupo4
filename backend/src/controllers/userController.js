const db = require('../config/db');

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

module.exports = {
  saveDeviceToken
};
