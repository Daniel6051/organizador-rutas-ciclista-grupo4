// DESPUÉS
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const BASE_URL =
Constants.expoConfig?.extra?.API_URL ?? "http://192.168.1.5:3000";
const STORAGE_KEY = '@ciclomendoza:auth';

// Callback que AuthContext registra para forzar el logout cuando
// el refresh token también resultó inválido/expirado.
let onAuthExpiredCallback = null;
export function setOnAuthExpired(callback) {
  onAuthExpiredCallback = callback;
}

// Evita que dos requests disparen un refresh al mismo tiempo:
// si ya hay uno en curso, los demás esperan su resultado.
let refreshEnCurso = null;

async function getSesionGuardada() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function guardarSesion(sesion) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

async function limpiarSesion() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Pide un access token nuevo usando el refresh token guardado.
 * Si funciona, persiste la sesión actualizada y devuelve el nuevo token.
 * Si falla, limpia la sesión y avisa a AuthContext para que cierre sesión.
 */
async function renovarToken() {
  const sesion = await getSesionGuardada();
  if (!sesion?.refreshToken) {
    throw new Error('No hay refresh token disponible');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: sesion.refreshToken }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo renovar la sesión');
  }

  const nuevaSesion = {
    user: sesion.user,
    token: data.token,
    refreshToken: data.refreshToken,
  };
  await guardarSesion(nuevaSesion);
  return nuevaSesion.token;
}

async function request(path, options = {}, _esReintento = false) {
  const sesion = await getSesionGuardada();
  const token = sesion?.token || null;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

  // 401 = token vencido o inválido. Si no es ya un reintento, intentamos
  // renovar el access token con el refresh token y repetir la request una vez.
  if (res.status === 401 && !_esReintento && path !== '/auth/refresh-token') {
    try {
      if (!refreshEnCurso) {
        refreshEnCurso = renovarToken().finally(() => { refreshEnCurso = null; });
      }
      await refreshEnCurso;
      return request(path, options, true);
    } catch (refreshError) {
      await limpiarSesion();
      if (onAuthExpiredCallback) onAuthExpiredCallback();
      throw new Error('Tu sesión expiró, volvé a iniciar sesión.');
    }
  }

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

export function logoutUser() {
  return request("/auth/logout", { method: "POST" });
}

// ---------- Bicicletas ----------
export function getBikes() {
  return request("/bikes");
}

export function createBike({ nombre, tipo }) {
  return request("/bikes", {
    method: "POST",
    body: JSON.stringify({ nombre, tipo }),
  });
}

export function updateBike(bikeId, campos) {
  return request(`/bikes/${bikeId}`, {
    method: "PUT",
    body: JSON.stringify(campos),
  });
}

export function deleteBike(bikeId) {
  return request(`/bikes/${bikeId}`, {
    method: "DELETE",
  });
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

export function planRoute({ origen, destino }) {
  return request("/routes/plan", {
    method: "POST",
    body: JSON.stringify({ origen, destino }),
  });
}

// ---------- Estadísticas ----------
export function getStatsSummary() {
  return request("/stats/summary");
}

// ---------- Notificaciones ----------
export function registerDeviceToken({ userId, token }) {
  return request("/users/device-token", {
    method: "POST",
    body: JSON.stringify({ userId, token }),
  });
}

// ---------- Perfil ----------
export function updateProfile({ nombre }) {
  return request("/users/me", {
    method: "PUT",
    body: JSON.stringify({ nombre }),
  });
}

export function changePassword({ passwordActual, passwordNueva }) {
  return request("/users/me/password", {
    method: "PUT",
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
}
// ---------- Historial ----------
export function getRoutes() {
  return request("/routes");
}
// ---------- Incidentes ----------
export function reportIncident({ tipo, descripcion, lat, lng }) {
  return request("/incidents", {
    method: "POST",
    body: JSON.stringify({ tipo, descripcion, lat, lng }),
  });
}

export function getIncidents() {
  return request("/incidents");
}

export function deleteIncident(incidentId) {
  return request(`/incidents/${incidentId}`, {
    method: "DELETE",
  });
}