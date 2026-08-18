const db = require('../config/db');

/**
 * Mapea y formatea la fila obtenida de PostgreSQL al contrato JSON de la API
 * @param {Object} row - Fila cruda de la base de datos
 * @returns {Object|null} Objeto con formato del contrato Bike
 */
function formatBike(row) {
  if (!row) return null;
  
  let formattedFecha = row.fecha_alta;
  if (row.fecha_alta instanceof Date) {
    formattedFecha = row.fecha_alta.toISOString().slice(0, 10);
  } else if (typeof row.fecha_alta === 'string') {
    formattedFecha = row.fecha_alta.slice(0, 10);
  }

  let componentes = row.componentes;
  if (typeof componentes === 'string') {
    try {
      componentes = JSON.parse(componentes);
    } catch {
      componentes = [];
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    nombre: row.nombre,
    tipo: row.tipo,
    fechaAlta: formattedFecha,
    componentes: componentes || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Obtiene todas las bicicletas asociadas a un usuario específico
 * @param {number|string} userId
 * @returns {Promise<Array>} Lista de bicicletas
 */
async function getBikesByUserId(userId) {
  const query = `
    SELECT id, user_id, nombre, tipo, fecha_alta, componentes, created_at, updated_at
    FROM bikes
    WHERE user_id = $1
    ORDER BY id ASC;
  `;
  const { rows } = await db.query(query, [userId]);
  return rows.map(formatBike);
}

/**
 * Busca una bicicleta por su ID asegurando que pertenezca al usuario
 * @param {number|string} bikeId
 * @param {number|string} userId
 * @returns {Promise<Object|null>}
 */
async function getBikeByIdAndUserId(bikeId, userId) {
  const query = `
    SELECT id, user_id, nombre, tipo, fecha_alta, componentes, created_at, updated_at
    FROM bikes
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await db.query(query, [bikeId, userId]);
  return rows[0] ? formatBike(rows[0]) : null;
}

/**
 * Inserta una nueva bicicleta en la base de datos asociada a un usuario
 * @param {Object} params
 * @param {number|string} params.userId
 * @param {string} params.nombre
 * @param {string} [params.tipo]
 * @param {string} [params.fechaAlta]
 * @param {Array} [params.componentes]
 * @returns {Promise<Object>} Bicicleta creada
 */
async function createBike({ userId, nombre, tipo, fechaAlta, componentes }) {
  const defaultComponentes = [
    { id: 'comp_1', tipo: 'cadena', desgaste: 0.0 },
    { id: 'comp_2', tipo: 'frenos', desgaste: 0.0 },
    { id: 'comp_3', tipo: 'neumaticos', desgaste: 0.0 },
  ];

  const finalComponentes = componentes && Array.isArray(componentes) && componentes.length > 0
    ? JSON.stringify(componentes)
    : JSON.stringify(defaultComponentes);

  const query = `
    INSERT INTO bikes (user_id, nombre, tipo, fecha_alta, componentes)
    VALUES ($1, $2, COALESCE($3, 'urbana'), COALESCE($4, CURRENT_DATE), $5::jsonb)
    RETURNING id, user_id, nombre, tipo, fecha_alta, componentes, created_at, updated_at;
  `;

  const values = [
    userId,
    nombre,
    tipo || 'urbana',
    fechaAlta || null,
    finalComponentes,
  ];

  const { rows } = await db.query(query, values);
  return formatBike(rows[0]);
}

/**
 * Actualiza los datos de una bicicleta perteneciente al usuario
 * @param {number|string} bikeId
 * @param {number|string} userId
 * @param {Object} fields - Campos a actualizar ({ nombre, tipo, fechaAlta, componentes })
 * @returns {Promise<Object|null>} Bicicleta actualizada o null si no existe
 */
async function updateBike(bikeId, userId, fields = {}) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (fields.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(fields.nombre);
  }
  if (fields.tipo !== undefined) {
    updates.push(`tipo = $${paramIndex++}`);
    values.push(fields.tipo);
  }
  if (fields.fechaAlta !== undefined || fields.fecha_alta !== undefined) {
    updates.push(`fecha_alta = $${paramIndex++}`);
    values.push(fields.fechaAlta || fields.fecha_alta);
  }
  if (fields.componentes !== undefined) {
    updates.push(`componentes = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(fields.componentes));
  }

  if (updates.length === 0) {
    return getBikeByIdAndUserId(bikeId, userId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(bikeId);
  const bikeIdParam = paramIndex++;
  values.push(userId);
  const userIdParam = paramIndex++;

  const query = `
    UPDATE bikes
    SET ${updates.join(', ')}
    WHERE id = $${bikeIdParam} AND user_id = $${userIdParam}
    RETURNING id, user_id, nombre, tipo, fecha_alta, componentes, created_at, updated_at;
  `;

  const { rows } = await db.query(query, values);
  return rows[0] ? formatBike(rows[0]) : null;
}

/**
 * Elimina una bicicleta si pertenece al usuario autenticado
 * @param {number|string} bikeId
 * @param {number|string} userId
 * @returns {Promise<boolean>} True si fue eliminada, false si no se encontró
 */
async function deleteBike(bikeId, userId) {
  const query = `
    DELETE FROM bikes
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;
  const { rows } = await db.query(query, [bikeId, userId]);
  return rows.length > 0;
}

module.exports = {
  getBikesByUserId,
  getBikeByIdAndUserId,
  createBike,
  updateBike,
  deleteBike,
  formatBike,
};
