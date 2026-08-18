// src/services/db.js
// Base de datos local (SQLite) para guardar puntos GPS del recorrido
// aunque no haya conectividad (ej: zonas de montaña sin señal).

import * as SQLite from "expo-sqlite";

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("bitacora.db");
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS puntos_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routeId TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitud REAL,
        timestamp TEXT NOT NULL
      );
    `);
  }
  return dbInstance;
}

// Guarda un punto GPS localmente
export async function guardarPuntoLocal(routeId, punto) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO puntos_pendientes (routeId, lat, lng, altitud, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [routeId, punto.lat, punto.lng, punto.altitud ?? null, punto.timestamp]
  );
}

// Trae los puntos guardados de una ruta que todavía no se subieron
export async function obtenerPuntosPendientes(routeId) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM puntos_pendientes WHERE routeId = ? ORDER BY id ASC`,
    [routeId]
  );
}

// Borra los puntos ya confirmados por el backend
export async function eliminarPuntosSincronizados(ids) {
  if (!ids || ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => "?").join(",");
  await db.runAsync(`DELETE FROM puntos_pendientes WHERE id IN (${placeholders})`, ids);
}