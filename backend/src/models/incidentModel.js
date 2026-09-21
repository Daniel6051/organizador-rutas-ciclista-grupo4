const db = require('../config/db');

/**
 * Crea un nuevo reporte de incidente
 */
async function createIncident({ userId, tipo, descripcion, lat, lng }) {
  const query = `
    INSERT INTO incidentes (user_id, tipo, descripcion, ubicacion)
    VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography)
    RETURNING id, user_id, tipo, descripcion,
      ST_Y(ubicacion::geometry) AS lat,
      ST_X(ubicacion::geometry) AS lng,
      created_at;
  `;
  const { rows } = await db.query(query, [userId, tipo, descripcion || null, lng, lat]);
  return rows[0];
}

/**
 * Lista los incidentes vigentes (no expirados, últimas 24hs)
 */
async function getActiveIncidents() {
  const query = `
    SELECT id, user_id, tipo, descripcion,
      ST_Y(ubicacion::geometry) AS lat,
      ST_X(ubicacion::geometry) AS lng,
      created_at
    FROM incidentes
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC;
  `;
  const { rows } = await db.query(query);
  return rows;
}

/**
 * Borra un incidente, solo si pertenece al usuario que lo reportó
 */
async function deleteIncident(incidentId, userId) {
  const query = `DELETE FROM incidentes WHERE id = $1 AND user_id = $2 RETURNING id;`;
  const { rows } = await db.query(query, [incidentId, userId]);
  return rows.length > 0;
}

module.exports = { createIncident, getActiveIncidents, deleteIncident };