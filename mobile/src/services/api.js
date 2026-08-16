// src/services/api.js
// Cliente HTTP centralizado hacia el backend (hoy: mock-backend en localhost:3000).
// Cuando el subgrupo de backend (Tormo + Contreras) tenga la API real lista,
// acá es el ÚNICO lugar que hay que tocar: cambiar BASE_URL.

// IMPORTANTE: reemplazar por la IP local de tu compu en la red (no "localhost",
// porque el celu/emulador no la resuelve). Ejemplo: "http://192.168.0.15:3000"
export const BASE_URL = "http://192.168.1.5:3000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || `Error ${res.status} en ${path}`;
    throw new Error(message);
  }

  return data;
}

// ---------- Auth ----------
export function registerUser({ email, nombre, password }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, nombre, password }),
  });
}

export function loginUser({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---------- Bicicletas ----------
export function getBikes() {
  return request("/bikes");
}

// ---------- Recorridos ----------
export function startRoute({ bikeId }) {
  return request("/routes/start", {
    method: "POST",
    body: JSON.stringify({ bikeId }),
  });
}

export function sendRoutePoints(routeId, puntos) {
  return request(`/routes/${routeId}/points`, {
    method: "POST",
    body: JSON.stringify({ puntos }),
  });
}

export function finishRoute(routeId, { distanciaKm, desnivelM, terreno } = {}) {
  return request(`/routes/${routeId}/finish`, {
    method: "POST",
    body: JSON.stringify({ distanciaKm, desnivelM, terreno }),
  });
}
