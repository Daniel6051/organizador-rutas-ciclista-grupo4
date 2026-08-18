// src/services/sync.js
// Sube al backend los puntos GPS que quedaron guardados localmente
// (por ejemplo, porque no había señal en el momento).

import { sendRoutePoints } from "./api";
import { obtenerPuntosPendientes, eliminarPuntosSincronizados } from "./db";

export async function sincronizarRuta(routeId) {
  const pendientes = await obtenerPuntosPendientes(routeId);
  if (pendientes.length === 0) return 0;

  const puntos = pendientes.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    altitud: p.altitud,
    timestamp: p.timestamp,
  }));

  await sendRoutePoints(routeId, puntos);
  await eliminarPuntosSincronizados(pendientes.map((p) => p.id));
  return pendientes.length;
}