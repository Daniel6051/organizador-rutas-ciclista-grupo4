const axios = require('axios');

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/cycling-regular/geojson';

/**
 * Calcula la mejor ruta ciclista entre dos puntos usando OpenRouteService,
 * evitando autopistas y priorizando vías más seguras para ciclistas.
 * @param {{lat: number, lng: number}} origen
 * @param {{lat: number, lng: number}} destino
 * @returns {Promise<{geojson: Object, distanciaKm: number, duracionMin: number}>}
 */
async function calcularRuta(origen, destino) {
  try {
    const response = await axios.post(
      ORS_BASE_URL,
      {
        coordinates: [
          [origen.lng, origen.lat],
          [destino.lng, destino.lat],
        ],
        options: {
          avoid_features: ['fords'],
        },
      },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const feature = response.data.features[0];
    const distanciaKm = feature.properties.summary.distance / 1000;
    const duracionMin = feature.properties.summary.duration / 60;

    return {
      geojson: feature.geometry,
      distanciaKm: Number(distanciaKm.toFixed(2)),
      duracionMin: Number(duracionMin.toFixed(1)),
    };
  } catch (error) {
    console.error('Error de ORS:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

module.exports = { calcularRuta };