const incidentModel = require('../models/incidentModel');
const rutaActivaModel = require('../models/rutaActivaModel');
const notificationService = require('../services/notificationService');

const TIPOS_VALIDOS = ['bache', 'corte_calle', 'obra', 'inseguridad', 'semaforo_roto', 'otro'];
const TIPOS_QUE_ALERTAN = ['corte_calle', 'obra', 'inseguridad', 'semaforo_roto'];

/**
 * Reportar un nuevo incidente
 * POST /incidents
 */
async function reportIncident(req, res) {
  try {
    const userId = req.user.id;
    const { tipo, descripcion, lat, lng } = req.body;

    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `Tipo de incidente inválido. Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
    }
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Faltan coordenadas de ubicación' });
    }

    const incidente = await incidentModel.createIncident({ userId, tipo, descripcion, lat, lng });

    // Alertar a ciclistas con ruta activa cerca, sin bloquear la respuesta HTTP
    if (TIPOS_QUE_ALERTAN.includes(tipo)) {
      rutaActivaModel
        .getUsuariosConRutaCercana({ lat, lng, excluirUserId: userId })
        .then((usuarios) => {
          usuarios.forEach((uid) => {
            notificationService.sendIncidentAlert(uid, incidente).catch((err) => {
              console.error('Fallo al enviar alerta de incidente en background:', err);
            });
          });
        })
        .catch((err) => console.error('No se pudo buscar rutas activas cercanas:', err.message));
    }

    return res.status(201).json(incidente);
  } catch (error) {
    console.error('Error en reportIncident:', error);
    return res.status(500).json({ error: 'Error interno del servidor al reportar el incidente' });
  }
}

/**
 * Listar incidentes vigentes
 * GET /incidents
 */
async function listIncidents(req, res) {
  try {
    const incidentes = await incidentModel.getActiveIncidents();
    return res.json(incidentes);
  } catch (error) {
    console.error('Error en listIncidents:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar incidentes' });
  }
}

/**
 * Borrar un incidente propio
 * DELETE /incidents/:id
 */
async function removeIncident(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const borrado = await incidentModel.deleteIncident(Number(id), userId);
    if (!borrado) {
      return res.status(404).json({ error: 'Incidente no encontrado o no te pertenece' });
    }

    return res.json({ mensaje: 'Incidente eliminado' });
  } catch (error) {
    console.error('Error en removeIncident:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar el incidente' });
  }
}

module.exports = { reportIncident, listIncidents, removeIncident };