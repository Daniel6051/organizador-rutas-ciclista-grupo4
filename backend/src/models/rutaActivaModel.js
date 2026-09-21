const db = require('../config/db');

/**
 * Guarda (o reemplaza) la ruta planificada activa de un usuario.
 * @param {number|string} userId
 * @param {Object} geojsonLineString - geometría LineString devuelta por routingService
 */
async function guardarRutaActiva(userId, geojsonLineString) {
  const query = `
    INSERT INTO rutas_activas (user_id, ruta_geojson, creado_en)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET ruta_geojson = $2, creado_en = NOW();
  `;
  await db.query(query, [userId, JSON.stringify(geojsonLineString)]);
}

/**
 * Busca usuarios (excluyendo al que reporta) cuya ruta activa pasa
 * a menos de `radioMetros` del punto del incidente, y cuya ruta
 * fue planificada en las últimas 3 horas (evita alertar por rutas viejas).
 * @param {{lat: number, lng: number, radioMetros?: number, excluirUserId: number|string}} params
 * @returns {Promise<Array<number>>} IDs de usuarios a notificar
 */
async function getUsuariosConRutaCercana({ lat, lng, radioMetros = 150, excluirUserId }) {
  const query = `
    SELECT user_id
    FROM rutas_activas
    WHERE user_id != $1
      AND creado_en > NOW() - INTERVAL '3 hours'
      AND ST_DWithin(
        ST_GeomFromGeoJSON(ruta_geojson)::geography,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4
      );
  `;
  const { rows } = await db.query(query, [excluirUserId, lng, lat, radioMetros]);
  return rows.map((r) => r.user_id);
}

module.exports = { guardarRutaActiva, getUsuariosConRutaCercana };