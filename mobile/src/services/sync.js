// src/services/sync.js
import { sendRoutePoints, startRoute, finishRoute } from './api';
import {
  obtenerPuntosPendientes,
  eliminarPuntosSincronizados,
  obtenerRutasPendientes,
  marcarRutaSincronizada,
} from './db';
import { hayConexion } from './network';

// Sube los puntos GPS pendientes de una ruta ya creada en el backend
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

// Evita que dos llamadas a sincronizarRutasPendientes corran en simultáneo
// (puede pasar si el estado de red "parpadea" y el listener de conectividad
// dispara el evento de reconexión más de una vez seguida).
let sincronizacionEnCurso = false;

// Sube todas las rutas que se crearon offline
export async function sincronizarRutasPendientes() {
  if (sincronizacionEnCurso) {
    console.log('Ya hay una sincronización en curso, se omite este intento.');
    return 0;
  }
  sincronizacionEnCurso = true; // tomar el candado ANTES de cualquier await

  try {
    const conexion = await hayConexion();
    if (!conexion) return 0;

    const rutas = await obtenerRutasPendientes();
    let sincronizadas = 0;

    for (const ruta of rutas) {
      try {
        const route = await startRoute({ bikeId: ruta.bikeId });

        const puntos = await obtenerPuntosPendientes(ruta.localId);
        if (puntos.length > 0) {
          const puntosFormateados = puntos.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            altitud: p.altitud,
            timestamp: p.timestamp,
          }));
          await sendRoutePoints(route.id, puntosFormateados);
          await eliminarPuntosSincronizados(puntos.map((p) => p.id));
        }

        await finishRoute(route.id, {
          distanciaKm: ruta.distanciaKm,
          desnivelM: ruta.desnivelM,
          terreno: ruta.terreno,
          clima: ruta.clima,
          estilo_conduccion: ruta.estilo_conduccion,
        });

        await marcarRutaSincronizada(ruta.localId);
        sincronizadas++;
      } catch (err) {
        console.warn(`No se pudo sincronizar ruta ${ruta.localId}:`, err.message);
      }
    }

    return sincronizadas;
  } finally {
    sincronizacionEnCurso = false;
  }
}