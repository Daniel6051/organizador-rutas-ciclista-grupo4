const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log(' Base de datos PostgreSQL conectada exitosamente.');
});

pool.on('error', (err) => {
  console.error(' Error inesperado en el pool de conexiones de PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
