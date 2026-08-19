const db = require('../config/db');

/**
 * Mapea la fila de la base de datos y la geometría GeoJSON al contrato de API
 * @param {Object} row - Fila cruda de PostgreSQL
 * @param {Array} [puntos] - Puntos GPS asociados
 * @returns {Object|null}
 */
function formatRoute(row, puntos = []) {
  if (!row) return null;

  let geojson = null;
  if (row.geojson) {
    try {
      geojson = typeof row.geojson === 'string' ? JSON.parse(row.geojson) : row.geojson;
    } catch {
      geojson = null;
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    bikeId: row.bike_id,
    inicio: row.inicio,
    fin: row.fin,
    status: row.status || (row.finalizado ? 'finished' : 'active'),
    finalizado: Boolean(row.finalizado),
    distanciaKm: row.distancia_km !== null && row.distancia_km !== undefined ? parseFloat(row.distancia_km) : null,
    desnivelM: row.desnivel_m !== null && row.desnivel_m !== undefined ? parseFloat(row.desnivel_m) : null,
    terreno: row.terreno || 'mixto',
    geojson: geojson,
    puntosGPS: puntos || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Inicia un nuevo recorrido para un usuario y opcionalmente una bicicleta
 * @param {Object} params - { userId, bikeId }
 * @returns {Promise<Object>} Recorrido iniciado
 */
async function startRoute({ userId, bikeId = null }) {
  const query = `
    INSERT INTO routes (user_id, bike_id, status, finalizado, inicio)
    VALUES ($1, $2, 'active', FALSE, CURRENT_TIMESTAMP)
    RETURNING id, user_id, bike_id, inicio, fin, status, finalizado, distancia_km, desnivel_m, terreno, created_at, updated_at;
  `;
  const values = [userId, bikeId ? Number(bikeId) : null];
  const { rows } = await db.query(query, values);
  return formatRoute(rows[0]);
}

/**
 * Agrega un lote (batch) de puntos GPS a un recorrido activo
 * @param {number|string} routeId
 * @param {number|string} userId
 * @param {Array} points - Arreglo de objetos { lat, lng, altitud, timestamp }
 * @returns {Promise<Object>} { ok: true, totalPuntos } o error
 */
async function addRoutePoints(routeId, userId, points = []) {
  const checkQuery = `SELECT id, status, finalizado FROM routes WHERE id = $1 AND user_id = $2;`;
  const checkRes = await db.query(checkQuery, [routeId, userId]);

  if (checkRes.rows.length === 0) {
    return { error: 'NOT_FOUND' };
  }

  if (checkRes.rows[0].finalizado || checkRes.rows[0].status === 'finished') {
    return { error: 'ROUTE_ALREADY_FINISHED' };
  }

  if (!points || points.length === 0) {
    const countRes = await db.query(`SELECT COUNT(*)::int as count FROM route_points WHERE route_id = $1;`, [routeId]);
    return { ok: true, totalPuntos: countRes.rows[0].count };
  }

  const valueRows = [];
  const params = [routeId];
  let paramIdx = 2;

  for (const pt of points) {
    const lat = pt.lat !== undefined ? Number(pt.lat) : (pt.latitude !== undefined ? Number(pt.latitude) : null);
    const lng = pt.lng !== undefined ? Number(pt.lng) : (pt.longitude !== undefined ? Number(pt.longitude) : null);
    const alt = pt.altitud !== undefined ? Number(pt.altitud) : (pt.altitude !== undefined ? Number(pt.altitude) : 0);
    const recordedAt = pt.timestamp ? new Date(pt.timestamp) : new Date();

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      const latParam = paramIdx++;
      const lngParam = paramIdx++;
      const altParam = paramIdx++;
      const dateParam = paramIdx++;

      valueRows.push(`($1, $${latParam}, $${lngParam}, $${altParam}, ST_SetSRID(ST_MakePoint($${lngParam}, $${latParam}), 4326), $${dateParam})`);
      params.push(lat, lng, isNaN(alt) ? 0 : alt, recordedAt);
    }
  }

  if (valueRows.length > 0) {
    const insertQuery = `
      INSERT INTO route_points (route_id, latitude, longitude, altitude, geom, recorded_at)
      VALUES ${valueRows.join(',\n')};
    `;
    await db.query(insertQuery, params);
  }

  const countRes = await db.query(`SELECT COUNT(*)::int as count FROM route_points WHERE route_id = $1;`, [routeId]);
  return { ok: true, totalPuntos: countRes.rows[0].count };
}

/**
 * Finaliza un recorrido, consolida la geometría PostGIS (LineString) y calcula métricas
 * @param {number|string} routeId
 * @param {number|string} userId
 * @param {Object} metrics - { distanciaKm, desnivelM, terreno }
 * @returns {Promise<Object|null>} Recorrido finalizado
 */
async function finishRoute(routeId, userId, { distanciaKm, desnivelM, terreno } = {}) {
  // Verificar existencia y pertenencia
  const checkQuery = `SELECT id, status, finalizado FROM routes WHERE id = $1 AND user_id = $2;`;
  const checkRes = await db.query(checkQuery, [routeId, userId]);
  if (checkRes.rows.length === 0) {
    return null;
  }

  // Obtener puntos registrados
  const pointsRes = await db.query(
    `SELECT id, latitude, longitude, altitude, recorded_at
     FROM route_points
     WHERE route_id = $1
     ORDER BY id ASC;`,
    [routeId]
  );
  const points = pointsRes.rows;

  let calculatedDistKm = null;
  let calculatedElevationGain = null;

  if (points.length >= 2) {
    // Cálculo geodésico de longitud en km usando PostGIS (geography)
    const distQuery = `
      SELECT
        ST_Length(ST_SetSRID(ST_MakeLine(geom ORDER BY id ASC), 4326)::geography) / 1000.0 AS dist_km
      FROM route_points
      WHERE route_id = $1;
    `;
    const distRes = await db.query(distQuery, [routeId]);
    if (distRes.rows[0] && distRes.rows[0].dist_km !== null) {
      calculatedDistKm = parseFloat(Number(distRes.rows[0].dist_km).toFixed(2));
    }

    // Cálculo del desnivel positivo acumulado (elevation gain)
    let gain = 0;
    for (let i = 1; i < points.length; i++) {
      const diff = (points[i].altitude || 0) - (points[i - 1].altitude || 0);
      if (diff > 0) gain += diff;
    }
    calculatedElevationGain = parseFloat(gain.toFixed(2));
  }

  const finalDistKm = distanciaKm !== undefined && distanciaKm !== null
    ? parseFloat(distanciaKm)
    : (calculatedDistKm !== null ? calculatedDistKm : 0.0);

  const finalDesnivelM = desnivelM !== undefined && desnivelM !== null
    ? parseFloat(desnivelM)
    : (calculatedElevationGain !== null ? calculatedElevationGain : 0.0);

  const finalTerreno = terreno ? String(terreno).trim() : 'mixto';

  let updateQuery;
  let updateValues;

  if (points.length >= 2) {
    updateQuery = `
      UPDATE routes
      SET
        geom = (
          SELECT ST_SetSRID(ST_MakeLine(geom ORDER BY id ASC), 4326)
          FROM route_points
          WHERE route_id = $1
        ),
        distancia_km = $2,
        desnivel_m = $3,
        terreno = $4,
        fin = CURRENT_TIMESTAMP,
        status = 'finished',
        finalizado = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $5
      RETURNING id, user_id, bike_id, inicio, fin, status, finalizado, distancia_km, desnivel_m, terreno, ST_AsGeoJSON(geom) AS geojson, created_at, updated_at;
    `;
    updateValues = [routeId, finalDistKm, finalDesnivelM, finalTerreno, userId];
  } else {
    updateQuery = `
      UPDATE routes
      SET
        distancia_km = $2,
        desnivel_m = $3,
        terreno = $4,
        fin = CURRENT_TIMESTAMP,
        status = 'finished',
        finalizado = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $5
      RETURNING id, user_id, bike_id, inicio, fin, status, finalizado, distancia_km, desnivel_m, terreno, ST_AsGeoJSON(geom) AS geojson, created_at, updated_at;
    `;
    updateValues = [routeId, finalDistKm, finalDesnivelM, finalTerreno, userId];
  }

  const { rows } = await db.query(updateQuery, updateValues);
  const formattedPoints = points.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
    altitud: p.altitude,
    timestamp: p.recorded_at,
  }));

  return formatRoute(rows[0], formattedPoints);
}

/**
 * Obtiene todos los recorridos de un usuario
 * @param {number|string} userId
 * @returns {Promise<Array>}
 */
async function getRoutesByUserId(userId) {
  const query = `
    SELECT id, user_id, bike_id, inicio, fin, status, finalizado, distancia_km, desnivel_m, terreno, ST_AsGeoJSON(geom) AS geojson, created_at, updated_at
    FROM routes
    WHERE user_id = $1
    ORDER BY inicio DESC;
  `;
  const { rows } = await db.query(query, [userId]);
  return rows.map((r) => formatRoute(r));
}

/**
 * Obtiene el detalle de un recorrido específico con sus puntos GPS
 * @param {number|string} routeId
 * @param {number|string} userId
 * @returns {Promise<Object|null>}
 */
async function getRouteByIdAndUserId(routeId, userId) {
  const query = `
    SELECT id, user_id, bike_id, inicio, fin, status, finalizado, distancia_km, desnivel_m, terreno, ST_AsGeoJSON(geom) AS geojson, created_at, updated_at
    FROM routes
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await db.query(query, [routeId, userId]);
  if (rows.length === 0) return null;

  const pointsRes = await db.query(
    `SELECT latitude, longitude, altitude, recorded_at
     FROM route_points
     WHERE route_id = $1
     ORDER BY id ASC;`,
    [routeId]
  );

  const formattedPoints = pointsRes.rows.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
    altitud: p.altitude,
    timestamp: p.recorded_at,
  }));

  return formatRoute(rows[0], formattedPoints);
}

/**
 * Resumen de estadísticas acumuladas para un usuario
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
async function getStatsSummary(userId) {
  const query = `
    SELECT
      COUNT(*)::int AS total_recorridos,
      COALESCE(SUM(distancia_km), 0)::float AS distancia_total_km,
      COALESCE(SUM(desnivel_m), 0)::float AS desnivel_total_m
    FROM routes
    WHERE user_id = $1 AND finalizado = TRUE;
  `;
  const { rows } = await db.query(query, [userId]);
  return {
    totalRecorridos: rows[0].total_recorridos,
    distanciaTotalKm: parseFloat(Number(rows[0].distancia_total_km).toFixed(2)),
    desnivelTotalM: parseFloat(Number(rows[0].desnivel_total_m).toFixed(2)),
  };
}

module.exports = {
  startRoute,
  addRoutePoints,
  finishRoute,
  getRoutesByUserId,
  getRouteByIdAndUserId,
  getStatsSummary,
  formatRoute,
};
