// src/services/db.js
import * as SQLite from 'expo-sqlite';

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('bitacora.db');
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS puntos_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routeId TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitud REAL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rutas_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        localId TEXT NOT NULL,
        bikeId TEXT NOT NULL,
        inicio TEXT NOT NULL,
        fin TEXT,
        distanciaKm REAL DEFAULT 0,
        desnivelM REAL DEFAULT 0,
        terreno TEXT DEFAULT 'mixto',
        clima TEXT DEFAULT 'soleado',
        estilo_conduccion TEXT DEFAULT 'moderado',
        sincronizado INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bicis_cache (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL
      );
    `);
  }
  return dbInstance;
}

// ---------- Puntos GPS ----------
export async function guardarPuntoLocal(routeId, punto) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO puntos_pendientes (routeId, lat, lng, altitud, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [routeId, punto.lat, punto.lng, punto.altitud ?? null, punto.timestamp]
  );
}

export async function obtenerPuntosPendientes(routeId) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM puntos_pendientes WHERE routeId = ? ORDER BY id ASC`,
    [routeId]
  );
}

export async function eliminarPuntosSincronizados(ids) {
  if (!ids || ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM puntos_pendientes WHERE id IN (${placeholders})`, ids);
}

// ---------- Rutas offline ----------
export async function guardarRutaLocal({ localId, bikeId, inicio, clima, estilo_conduccion }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO rutas_pendientes (localId, bikeId, inicio, clima, estilo_conduccion) VALUES (?, ?, ?, ?, ?)`,
    [localId, bikeId, inicio, clima, estilo_conduccion]
  );
}

export async function actualizarRutaLocal(localId, { fin, distanciaKm, desnivelM, terreno }) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE rutas_pendientes SET fin=?, distanciaKm=?, desnivelM=?, terreno=? WHERE localId=?`,
    [fin, distanciaKm, desnivelM, terreno, localId]
  );
}

export async function obtenerRutasPendientes() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM rutas_pendientes WHERE sincronizado = 0`);
}

export async function marcarRutaSincronizada(localId) {
  const db = await getDb();
  await db.runAsync(`UPDATE rutas_pendientes SET sincronizado = 1 WHERE localId = ?`, [localId]);
}

// ---------- Bicis cache ----------
export async function cachearBicis(bicis) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM bicis_cache`);
  for (const b of bicis) {
    await db.runAsync(
      `INSERT OR REPLACE INTO bicis_cache (id, nombre, tipo) VALUES (?, ?, ?)`,
      [String(b.id), b.nombre, b.tipo]
    );
  }
}

export async function obtenerBicisCache() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM bicis_cache`);
}