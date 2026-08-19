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

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
