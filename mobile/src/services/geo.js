// src/services/geo.js
// Cálculos a partir de los puntos GPS registrados durante un recorrido.
// Se usan para mandarle al backend datos reales en vez de dejar que el
// mock invente valores random en /routes/:id/finish.

const RADIO_TIERRA_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Distancia entre dos coordenadas (fórmula de Haversine), en km
function distanciaEntrePuntos(p1, p2) {
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_KM * c;
}

// Suma la distancia entre puntos consecutivos -> distancia total del recorrido (km)
export function calcularDistanciaKm(puntos) {
  if (!puntos || puntos.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    total += distanciaEntrePuntos(puntos[i - 1], puntos[i]);
  }
  return +total.toFixed(2);
}

// Suma solo los tramos donde la altitud sube -> desnivel positivo acumulado (m)
export function calcularDesnivelM(puntos) {
  if (!puntos || puntos.length < 2) return 0;
  let desnivel = 0;
  for (let i = 1; i < puntos.length; i++) {
    const alt1 = puntos[i - 1].altitud;
    const alt2 = puntos[i].altitud;
    if (typeof alt1 === "number" && typeof alt2 === "number" && alt2 > alt1) {
      desnivel += alt2 - alt1;
    }
  }
  return Math.round(desnivel);
}
