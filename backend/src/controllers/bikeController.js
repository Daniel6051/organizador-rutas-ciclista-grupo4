const bikeModel = require('../models/bikeModel');

/**
 * Listar todas las bicicletas del usuario autenticado
 * GET /bikes
 */
async function listBikes(req, res) {
  try {
    const userId = req.user.id;
    const bikes = await bikeModel.getBikesByUserId(userId);
    return res.json(bikes);
  } catch (error) {
    console.error('Error en listBikes:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar las bicicletas' });
  }
}

/**
 * Crear una nueva bicicleta asociada al usuario autenticado
 * POST /bikes
 */
async function createBike(req, res) {
  try {
    const userId = req.user.id;
    const { nombre, tipo, fechaAlta, componentes } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El campo "nombre" es requerido y no puede estar vacío' });
    }

    if (componentes !== undefined && !Array.isArray(componentes)) {
      return res.status(400).json({ error: 'El campo "componentes" debe ser un arreglo' });
    }

    const newBike = await bikeModel.createBike({
      userId,
      nombre: nombre.trim(),
      tipo: tipo ? String(tipo).trim() : 'urbana',
      fechaAlta,
      componentes,
    });

    return res.status(201).json(newBike);
  } catch (error) {
    console.error('Error en createBike:', error);
    return res.status(500).json({ error: 'Error interno del servidor al crear la bicicleta' });
  }
}

/**
 * Obtener los detalles de una bicicleta por su ID
 * GET /bikes/:id
 */
async function getBikeById(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    const bike = await bikeModel.getBikeByIdAndUserId(Number(id), userId);

    if (!bike) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    return res.json(bike);
  } catch (error) {
    console.error('Error en getBikeById:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener la bicicleta' });
  }
}

/**
 * Actualizar una bicicleta existente
 * PUT /bikes/:id
 */
async function updateBike(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    const { nombre, tipo, fechaAlta, fecha_alta, componentes } = req.body;

    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
      return res.status(400).json({ error: 'El campo "nombre" no puede estar vacío' });
    }

    if (componentes !== undefined && !Array.isArray(componentes)) {
      return res.status(400).json({ error: 'El campo "componentes" debe ser un arreglo' });
    }

    const updatedBike = await bikeModel.updateBike(Number(id), userId, {
      nombre: nombre ? nombre.trim() : undefined,
      tipo: tipo ? String(tipo).trim() : undefined,
      fechaAlta: fechaAlta || fecha_alta,
      componentes,
    });

    if (!updatedBike) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    return res.json(updatedBike);
  } catch (error) {
    console.error('Error en updateBike:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar la bicicleta' });
  }
}

/**
 * Eliminar una bicicleta
 * DELETE /bikes/:id
 */
async function deleteBike(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    const deleted = await bikeModel.deleteBike(Number(id), userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error en deleteBike:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar la bicicleta' });
  }
}

/**
 * Obtener el estado de mantenimiento de una bicicleta
 * GET /bikes/:id/maintenance
 */
async function getBikeMaintenance(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    const bike = await bikeModel.getBikeByIdAndUserId(Number(id), userId);

    if (!bike) {
      return res.status(404).json({ error: 'Bicicleta no encontrada' });
    }

    const componentes = bike.componentes || [];
    const proximaRevisionComponente = componentes.find((c) => c.desgaste > 0.5);

    return res.json({
      bikeId: bike.id,
      componentes,
      proximaRevision: proximaRevisionComponente ? proximaRevisionComponente.tipo : null,
    });
  } catch (error) {
    console.error('Error en getBikeMaintenance:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener mantenimiento' });
  }
}

module.exports = {
  listBikes,
  createBike,
  getBikeById,
  updateBike,
  deleteBike,
  getBikeMaintenance,
};
