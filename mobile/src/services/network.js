// src/services/network.js
// Detecta si hay conexión a internet y ejecuta acciones cuando vuelve la señal.
//
// Importante: NetInfo solo confirma que el CELULAR tiene internet en general
// (wifi o datos). Eso no garantiza que nuestro backend específico (BASE_URL)
// sea alcanzable — por ejemplo, si el celular está en otra red wifi distinta
// a la de la PC que corre el backend, o si el backend está apagado. Por eso,
// además de NetInfo, hacemos un pedido corto y con timeout al backend antes
// de decir "sí, hay conexión". Si ese pedido falla o tarda demasiado, se
// trata igual que estar offline y la app cae al flujo de guardado local.

import NetInfo from '@react-native-community/netinfo';
import { BASE_URL } from './api';

const TIMEOUT_CHEQUEO_MS = 2500;

async function backendResponde() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CHEQUEO_MS);

  try {
    // No importa qué devuelva (200, 404, lo que sea): si el fetch resuelve,
    // el backend está ahí y respondiendo. Solo nos interesa la alcanzabilidad,
    // no el contenido de la respuesta.
    await fetch(BASE_URL, { method: 'GET', signal: controller.signal });
    return true;
  } catch (err) {
    // Timeout (AbortError) o error de red (backend apagado, IP inalcanzable, etc.)
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function hayConexion() {
  const state = await NetInfo.fetch();
  const tieneInternet = state.isConnected && state.isInternetReachable;

  if (!tieneInternet) return false;

  // El celular tiene internet, pero confirmamos que NUESTRO backend
  // puntual responda antes de intentar el flujo online.
  return await backendResponde();
}

export function escucharConexion(callback) {
  return NetInfo.addEventListener(callback);
}