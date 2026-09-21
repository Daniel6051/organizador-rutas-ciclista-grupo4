const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const db = require('../config/db');

// Ruta al archivo de credenciales copiado por el usuario
const serviceAccountPath = path.join(__dirname, '../config/firebase-credentials.json');

let messagingApp;
try {
  const serviceAccount = require(serviceAccountPath);
  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  messagingApp = getMessaging(app);
  console.log('Firebase Admin inicializado correctamente.');
} catch (error) {
  console.error('Error inicializando Firebase Admin:', error.message);
}

/**
 * Obtiene el token FCM de un usuario desde la base de datos
 * @param {number|string} userId
 * @returns {Promise<string|null>} Token FCM o null
 */
async function getUserToken(userId) {
  try {
    const query = 'SELECT fcm_token FROM users WHERE id = $1';
    const { rows } = await db.query(query, [userId]);
    if (rows.length > 0 && rows[0].fcm_token) {
      return rows[0].fcm_token;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo FCM token del usuario:', error);
    return null;
  }
}

/**
 * Envía una alerta de mantenimiento por Firebase Cloud Messaging
 * @param {number|string} userId
 * @param {Object} evaluacionMantenimiento
 */
async function sendMaintenanceAlert(userId, evaluacionMantenimiento) {
  try {
    if (!messagingApp) {
      console.warn('Firebase Messaging no está inicializado, omitiendo notificación.');
      return;
    }
    
    const token = await getUserToken(userId);
    if (!token) {
      console.log(`No se envió notificación a usuario ${userId} porque no tiene fcm_token configurado.`);
      return;
    }

    const message = {
      notification: {
        title: '¡Alerta de Mantenimiento!',
        body: `Tu bicicleta requiere atención. Componentes afectados: ${evaluacionMantenimiento.componentesAfectados.join(', ')}. Índice de desgaste elevado.`
      },
      data: {
        routeId: String(evaluacionMantenimiento.routeId),
        indiceDesgaste: String(evaluacionMantenimiento.indiceDesgaste)
      },
      token: token
    };

    const response = await messagingApp.send(message);
    console.log('Notificación push enviada exitosamente:', response);
  } catch (error) {
    console.error('Error enviando notificación push:', error.message);
  }
}

const TIPOS_LABEL = {
  bache: 'Bache',
  corte_calle: 'Corte de calle',
  obra: 'Obra en la vía',
  inseguridad: 'Zona insegura',
  semaforo_roto: 'Semáforo roto',
  otro: 'Incidente',
};

/**
 * Envía una alerta de incidente cercano a la ruta planificada de un usuario
 * @param {number|string} userId
 * @param {Object} incidente - { id, tipo, descripcion }
 */
async function sendIncidentAlert(userId, incidente) {
  try {
    if (!messagingApp) {
      console.warn('Firebase Messaging no está inicializado, omitiendo notificación.');
      return;
    }

    const token = await getUserToken(userId);
    if (!token) {
      console.log(`No se envió alerta de incidente a usuario ${userId} porque no tiene fcm_token configurado.`);
      return;
    }

    const message = {
      notification: {
        title: `⚠️ ${TIPOS_LABEL[incidente.tipo] || 'Incidente'} en tu ruta`,
        body: incidente.descripcion || 'Un ciclista reportó un incidente cerca de tu ruta planificada.',
      },
      data: {
        incidentId: String(incidente.id),
        tipo: incidente.tipo,
      },
      token: token,
    };

    const response = await messagingApp.send(message);
    console.log('Alerta de incidente enviada exitosamente:', response);
  } catch (error) {
    console.error('Error enviando alerta de incidente:', error.message);
  }
}

module.exports = {
  sendMaintenanceAlert,
  sendIncidentAlert,
};