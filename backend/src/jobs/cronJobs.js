const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Asegurar que el directorio de backups exista
const backupDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function runBackupAndReconciliation() {
  console.log('[CRON] Iniciando proceso de respaldo y conciliación nocturna...');
  
  const client = await db.pool.connect();
  try {
    // 1. BACKUP
    const usersRes = await client.query('SELECT * FROM users');
    const bikesRes = await client.query('SELECT * FROM bikes');
    const routesRes = await client.query('SELECT * FROM routes');

    const backupData = {
      timestamp: new Date().toISOString(),
      users: usersRes.rows,
      bikes: bikesRes.rows,
      routes: routesRes.rows,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `respaldo_${dateStr}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`[CRON] Backup guardado exitosamente en: ${backupFile}`);

    // 2. CONCILIACIÓN
    console.log('[CRON] Iniciando conciliación de datos...');

    // A. Rutas huérfanas o eternas (> 24 hs en estado 'active')
    const updateOrphanRoutes = await client.query(`
      UPDATE routes 
      SET status = 'abandoned', finalizado = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND inicio < NOW() - INTERVAL '24 hours'
      RETURNING id;
    `);
    
    if (updateOrphanRoutes.rowCount > 0) {
      console.log(`[CRON] Conciliación: Se cerraron ${updateOrphanRoutes.rowCount} recorridos abandonados (> 24 hs). IDs:`, updateOrphanRoutes.rows.map(r => r.id).join(', '));
    }

    // B. Consistencia referencial
    const orphanedBikes = await client.query(`
      SELECT b.id, b.user_id FROM bikes b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE u.id IS NULL;
    `);
    if (orphanedBikes.rowCount > 0) {
      console.warn(`[CRON] Alerta de Consistencia: Existen ${orphanedBikes.rowCount} bicicletas asociadas a usuarios inexistentes.`);
    }

    const orphanedRoutes = await client.query(`
      SELECT r.id, r.user_id, r.bike_id FROM routes r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN bikes b ON r.bike_id = b.id
      WHERE u.id IS NULL OR (r.bike_id IS NOT NULL AND b.id IS NULL);
    `);
    if (orphanedRoutes.rowCount > 0) {
      console.warn(`[CRON] Alerta de Consistencia: Existen ${orphanedRoutes.rowCount} recorridos asociados a usuarios o bicicletas inexistentes.`);
    }

    console.log('[CRON] Proceso de respaldo y conciliación finalizado correctamente.');
  } catch (error) {
    console.error('[CRON] Error durante el proceso de respaldo y conciliación:', error);
  } finally {
    client.release();
  }
}

// Programar para ejecutarse a las 00:00 todos los días
function initCronJobs() {
  cron.schedule('0 0 * * *', () => {
    runBackupAndReconciliation();
  }, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
  });
  console.log('[CRON] Tareas programadas inicializadas.');
}

module.exports = {
  initCronJobs,
  runBackupAndReconciliation // Exportado también para testing si es necesario
};
