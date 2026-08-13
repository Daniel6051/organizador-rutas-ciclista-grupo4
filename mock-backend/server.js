// Mock server - Organizador de Rutas y Mantenimiento Ciclista
// Objetivo: que el equipo de mobile (React Native/Expo) pueda desarrollar
// contra un contrato de API estable mientras el equipo de backend construye
// la implementación real con PostgreSQL/PostGIS.
//
// Correr: npm install && npm start
// Base URL: http://localhost:3000

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------- Helpers ----------
function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Datos en memoria ----------
let users = [
  { id: "u_demo1", email: "demo@uda.edu.ar", nombre: "Ciclista Demo" },
];

let bikes = [
  {
    id: "bike_demo1",
    userId: "u_demo1",
    nombre: "MTB Trek",
    tipo: "montaña",
    fechaAlta: "2026-01-15",
    componentes: [
      { id: "comp_1", tipo: "cadena", desgaste: 0.32 },
      { id: "comp_2", tipo: "frenos", desgaste: 0.18 },
      { id: "comp_3", tipo: "neumaticos", desgaste: 0.55 },
    ],
  },
];

let routes = []; // recorridos

// ---------- AUTH ----------
app.post("/auth/register", (req, res) => {
  const { email, nombre, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos" });
  }
  const newUser = { id: uid("u"), email, nombre: nombre || "" };
  users.push(newUser);
  return res.status(201).json({
    user: newUser,
    token: "mock-jwt-" + newUser.id,
  });
});

app.post("/auth/login", (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email) || users[0];
  return res.json({
    user,
    token: "mock-jwt-" + user.id,
  });
});

// ---------- PERFILES DE BICICLETA ----------
app.get("/bikes", (req, res) => {
  res.json(bikes);
});

app.post("/bikes", (req, res) => {
  const { nombre, tipo } = req.body;
  const newBike = {
    id: uid("bike"),
    userId: "u_demo1",
    nombre: nombre || "Nueva bici",
    tipo: tipo || "urbana",
    fechaAlta: new Date().toISOString().slice(0, 10),
    componentes: [
      { id: uid("comp"), tipo: "cadena", desgaste: 0 },
      { id: uid("comp"), tipo: "frenos", desgaste: 0 },
      { id: uid("comp"), tipo: "neumaticos", desgaste: 0 },
    ],
  };
  bikes.push(newBike);
  res.status(201).json(newBike);
});

app.get("/bikes/:id", (req, res) => {
  const bike = bikes.find((b) => b.id === req.params.id);
  if (!bike) return res.status(404).json({ error: "Bicicleta no encontrada" });
  res.json(bike);
});

app.put("/bikes/:id", (req, res) => {
  const bike = bikes.find((b) => b.id === req.params.id);
  if (!bike) return res.status(404).json({ error: "Bicicleta no encontrada" });
  Object.assign(bike, req.body);
  res.json(bike);
});

app.delete("/bikes/:id", (req, res) => {
  bikes = bikes.filter((b) => b.id !== req.params.id);
  res.status(204).send();
});

// ---------- RECORRIDOS / BITÁCORA ----------
// Inicia un recorrido
app.post("/routes/start", (req, res) => {
  const { bikeId } = req.body;
  const newRoute = {
    id: uid("route"),
    bikeId: bikeId || "bike_demo1",
    inicio: new Date().toISOString(),
    fin: null,
    puntosGPS: [],
    distanciaKm: null,
    desnivelM: null,
    terreno: null,
    finalizado: false,
  };
  routes.push(newRoute);
  res.status(201).json(newRoute);
});

// Recibe puntos GPS mientras el recorrido está activo (batch)
app.post("/routes/:id/points", (req, res) => {
  const route = routes.find((r) => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: "Recorrido no encontrado" });
  const { puntos } = req.body; // [{lat, lng, timestamp, altitud}]
  route.puntosGPS.push(...(puntos || []));
  res.json({ ok: true, totalPuntos: route.puntosGPS.length });
});

// Finaliza el recorrido -> dispara evaluación de mantenimiento (simulada)
app.post("/routes/:id/finish", (req, res) => {
  const route = routes.find((r) => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: "Recorrido no encontrado" });

  route.fin = new Date().toISOString();
  route.finalizado = true;
  route.distanciaKm = req.body.distanciaKm ?? +(Math.random() * 20 + 2).toFixed(1);
  route.desnivelM = req.body.desnivelM ?? Math.round(Math.random() * 300);
  route.terreno = req.body.terreno ?? "mixto";

  // Simulación del motor de mantenimiento ponderado (índice de desgaste)
  const evaluacion = {
    routeId: route.id,
    indiceDesgaste: +(Math.random() * 0.1).toFixed(3),
    componentesAfectados: ["cadena", "frenos"],
    alertaGenerada: route.distanciaKm > 15,
  };

  res.json({ route, evaluacionMantenimiento: evaluacion });
});

app.get("/routes", (req, res) => {
  res.json(routes);
});

app.get("/routes/:id", (req, res) => {
  const route = routes.find((r) => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: "Recorrido no encontrado" });
  res.json(route);
});

// ---------- ESTADÍSTICAS ----------
app.get("/stats/summary", (req, res) => {
  const finalizados = routes.filter((r) => r.finalizado);
  res.json({
    totalRecorridos: finalizados.length,
    distanciaTotalKm: finalizados.reduce((a, r) => a + (r.distanciaKm || 0), 0),
    desnivelTotalM: finalizados.reduce((a, r) => a + (r.desnivelM || 0), 0),
  });
});

// ---------- MANTENIMIENTO ----------
app.get("/bikes/:id/maintenance", (req, res) => {
  const bike = bikes.find((b) => b.id === req.params.id);
  if (!bike) return res.status(404).json({ error: "Bicicleta no encontrada" });
  res.json({
    bikeId: bike.id,
    componentes: bike.componentes,
    proximaRevision: bike.componentes.find((c) => c.desgaste > 0.5)?.tipo || null,
  });
});

// ---------- NOTIFICACIONES (registro de token FCM) ----------
app.post("/users/device-token", (req, res) => {
  const { userId, token } = req.body;
  res.json({ ok: true, userId, tokenGuardado: !!token });
});

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "mock-backend-ciclista" });
});

app.listen(PORT, () => {
  console.log(`Mock backend corriendo en http://localhost:${PORT}`);
});
