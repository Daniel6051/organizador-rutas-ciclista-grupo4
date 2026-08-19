const routeModel = require('../models/routeModel');

/**
 * Iniciar un nuevo recorrido
 * POST /routes/start
 */
async function start(req, res) {
  try {
    const userId = req.user.id;
    const { bikeId } = req.body;

    const newRoute = await routeModel.startRoute({
      userId,
      bikeId: bikeId || null,
    });

    return res.status(201).json(newRoute);
  } catch (error) {
    console.error('Error en startRoute:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar el recorrido' });
  }
}

/**
 * Enviar lote (batch) de puntos GPS para un recorrido activo
 * POST /routes/:id/points
 */
async function addPoints(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    const { puntos, points } = req.body;
    const rawPoints = puntos || points || [];

    if (!Array.isArray(rawPoints)) {
      return res.status(400).json({ error: 'Los puntos GPS deben ser proporcionados en un arreglo "puntos"' });
    }

    const result = await routeModel.addRoutePoints(Number(id), userId, rawPoints);

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    if (result.error === 'ROUTE_ALREADY_FINISHED') {
      return res.status(400).json({ error: 'El recorrido ya se encuentra finalizado' });
    }

    return res.json(result);
  } catch (error) {
    console.error('Error en addPoints:', error);
    return res.status(500).json({ error: 'Error interno del servidor al agregar puntos GPS' });
  }
}

/**
 * Finalizar un recorrido y consolidar la geometría PostGIS
 * POST /routes/:id/finish
 */
async function finish(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    const { distanciaKm, desnivelM, terreno } = req.body;

    const finishedRoute = await routeModel.finishRoute(Number(id), userId, {
      distanciaKm,
      desnivelM,
      terreno,
    });

    if (!finishedRoute) {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    // Evaluación inicial de desgaste compatible con el contrato mobile
    // y preparado para la posterior integración del motor de reglas de Tormo
    const distancia = finishedRoute.distanciaKm || 0;
    const desnivel = finishedRoute.desnivelM || 0;
    const desgasteEstimado = parseFloat((distancia * 0.004 + desnivel * 0.0001).toFixed(3));

    const evaluacionMantenimiento = {
      routeId: finishedRoute.id,
      indiceDesgaste: desgasteEstimado,
      componentesAfectados: ['cadena', 'frenos', 'neumaticos'],
      alertaGenerada: distancia > 15 || desgasteEstimado > 0.08,
    };

    return res.json({
      route: finishedRoute,
      evaluacionMantenimiento,
    });
  } catch (error) {
    console.error('Error en finishRoute:', error);
    return res.status(500).json({ error: 'Error interno del servidor al finalizar el recorrido' });
  }
}

/**
 * Listar todos los recorridos del usuario autenticado
 * GET /routes
 */
async function listRoutes(req, res) {
  try {
    const userId = req.user.id;
    const routes = await routeModel.getRoutesByUserId(userId);
    return res.json(routes);
  } catch (error) {
    console.error('Error en listRoutes:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los recorridos' });
  }
}

/**
 * Obtener detalle de un recorrido específico con GeoJSON
 * GET /routes/:id
 */
async function getRouteById(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    const route = await routeModel.getRouteByIdAndUserId(Number(id), userId);

    if (!route) {
      return res.status(404).json({ error: 'Recorrido no encontrado' });
    }

    return res.json(route);
  } catch (error) {
    console.error('Error en getRouteById:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener el recorrido' });
  }
}

/**
 * Resumen de estadísticas globales del usuario
 * GET /stats/summary o GET /routes/stats/summary
 */
async function getStatsSummary(req, res) {
  try {
    const userId = req.user.id;
    const summary = await routeModel.getStatsSummary(userId);
    return res.json(summary);
  } catch (error) {
    console.error('Error en getStatsSummary:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas' });
  }
}

module.exports = {
  start,
  addPoints,
  finish,
  listRoutes,
  getRouteById,
  getStatsSummary,
};
