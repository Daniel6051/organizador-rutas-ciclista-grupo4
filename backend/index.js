const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const bikeRoutes = require('./src/routes/bikeRoutes');
const routeRoutes = require('./src/routes/routeRoutes');
const userRoutes = require('./src/routes/userRoutes');
const routeController = require('./src/controllers/routeController');
const { authenticateToken } = require('./src/middleware/authMiddleware');
const { initCronJobs } = require('./src/jobs/cronJobs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta base de estado
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API REST - Organizador de Rutas y Mantenimiento Ciclista (Mendoza)',
  });
});

// Rutas de los módulos
app.use('/auth', authRoutes);
app.use('/bikes', bikeRoutes);
app.use('/routes', routeRoutes);
app.use('/users', userRoutes);

// Endpoint de estadísticas globales (contrato de API)
app.get('/stats/summary', authenticateToken, routeController.getStatsSummary);


// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar tareas programadas
initCronJobs();

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(` Servidor backend escuchando en http://localhost:${PORT}`);
});

module.exports = app;
