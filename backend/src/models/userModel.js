const db = require('../config/db');

/**
 * Inserta un nuevo usuario en la base de datos
 * @param {Object} userData - { email, nombre, passwordHash }
 * @returns {Promise<Object>} Usuario creado (sin hash de contraseña)
 */
async function createUser({ email, nombre, passwordHash }) {
  const query = `
    INSERT INTO users (email, nombre, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, nombre, created_at;
  `;
  const values = [email, nombre, passwordHash];
  const { rows } = await db.query(query, values);
  return rows[0];
}

/**
 * Busca un usuario por su correo electrónico (incluye hash de contraseña para validación)
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
  const query = `
    SELECT id, email, nombre, password_hash, created_at
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const { rows } = await db.query(query, [email]);
  return rows[0] || null;
}

/**
 * Busca un usuario por su ID
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function findUserById(id) {
  const query = `
    SELECT id, email, nombre, created_at
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

// ---------- Recuperación de contraseña ----------

/**
 * Guarda el código de recuperación (hasheado) y su expiración para un usuario.
 * @param {number|string} userId
 * @param {string} tokenHasheado - código de 6 dígitos ya hasheado con bcrypt
 * @param {Date} expira
 */
async function setResetToken(userId, tokenHasheado, expira) {
  const query = `
    UPDATE users
    SET reset_token = $1, reset_token_expira = $2
    WHERE id = $3;
  `;
  await db.query(query, [tokenHasheado, expira, userId]);
}

/**
 * Busca un usuario por email incluyendo sus datos de reset de contraseña.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserForReset(email) {
  const query = `
    SELECT id, email, reset_token, reset_token_expira
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const { rows } = await db.query(query, [email]);
  return rows[0] || null;
}

/**
 * Actualiza el password_hash del usuario y limpia el token de reset.
 * @param {number|string} userId
 * @param {string} passwordHash
 */
async function updatePasswordAndClearReset(userId, passwordHash) {
  const query = `
    UPDATE users
    SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL
    WHERE id = $2;
  `;
  await db.query(query, [passwordHash, userId]);
}

// ---------- NUEVO: Refresh token ----------

/**
 * Guarda el hash del refresh token vigente para un usuario (reemplaza cualquier anterior).
 * @param {number|string} userId
 * @param {string} refreshTokenHash
 * @param {Date} expira
 */
async function setRefreshToken(userId, refreshTokenHash, expira) {
  const query = `
    UPDATE users
    SET refresh_token_hash = $1, refresh_token_expira = $2
    WHERE id = $3;
  `;
  await db.query(query, [refreshTokenHash, expira, userId]);
}

/**
 * Busca un usuario por ID incluyendo sus datos de refresh token.
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function findUserForRefresh(id) {
  const query = `
    SELECT id, email, nombre, refresh_token_hash, refresh_token_expira
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

/**
 * Invalida el refresh token de un usuario (usar en logout).
 * @param {number|string} userId
 */
async function clearRefreshToken(userId) {
  const query = `
    UPDATE users
    SET refresh_token_hash = NULL, refresh_token_expira = NULL
    WHERE id = $1;
  `;
  await db.query(query, [userId]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  setResetToken,
  findUserForReset,
  updatePasswordAndClearReset,
  setRefreshToken,
  findUserForRefresh,
  clearRefreshToken,
};
