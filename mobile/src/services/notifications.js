// src/services/notifications.js
// Maneja permisos, generación del token del dispositivo, y la suscripción
// para reaccionar cuando llega una notificación (ej: alerta de mantenimiento).
//
// NOTA: desde Expo SDK 53+, Expo Go ya no puede generar tokens de push
// reales (hace falta una "development build"). Para poder demostrar el
// flujo completo (permiso -> registro en backend -> recepción) sin salir
// de Expo Go, si detectamos que corremos en Expo Go generamos un token
// simulado en vez de fallar.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import { registerDeviceToken } from "./api";

const esExpoGo = Constants.appOwnership === "expo";

// Config: cómo se comporta una notificación mientras la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso, genera el token de este dispositivo, y lo registra en el backend
export async function registrarNotificaciones(userId) {
   if (!Device.isDevice && !esExpoGo) {
    console.warn("Las notificaciones push no funcionan en un emulador, usá un celular real.");
    return null;
  }

  const { status: statusActual } = await Notifications.getPermissionsAsync();
  let statusFinal = statusActual;

  if (statusActual !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    statusFinal = status;
  }

  if (statusFinal !== "granted") {
    console.warn("Permiso de notificaciones denegado.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let token;

  if (esExpoGo) {
    // Expo Go no puede generar tokens push reales desde SDK 53+.
    // Usamos un token simulado para poder demostrar el flujo completo.
    token = `expo-go-simulado-${userId}`;
    console.warn(
      "Corriendo en Expo Go: se usa un token simulado (no llegan push reales). " +
        "Para push reales hace falta una development build."
    );
  } else {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const resultado = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = resultado.data;
  }

  try {
    await registerDeviceToken({ userId, token });
  } catch (err) {
    console.warn("No se pudo registrar el token en el backend:", err.message);
  }

  return token;
}

// Se suscribe a las notificaciones que llegan mientras la app está abierta
export function suscribirseANotificaciones(callback) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

// Dispara una notificación LOCAL de prueba (útil para demostrar el manejo
// de notificaciones sin depender de push real, que Expo Go no soporta)
export async function dispararNotificacionLocalDePrueba() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Alerta de mantenimiento",
      body: "Tu bici tiene componentes con desgaste alto, revisala.",
    },
    trigger: null, // null = inmediata
  });
}

// ---------- Notificaciones locales (funcionan sin internet) ----------

// Muestra una notificación local inmediata. No usa backend ni token push,
// así que sirve también en emulador y sin conexión. En Android 13+ el canal
// tiene que existir ANTES de pedir el permiso, por eso se crea primero.
// Si no se puede mostrar (ej: permiso denegado), cae a un Alert común
// para que el aviso no se pierda.
export async function notificarLocal(titulo, cuerpo) {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: actual } = await Notifications.getPermissionsAsync();
    let status = actual;
    if (actual !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }

    if (status !== "granted") {
      Alert.alert(titulo, cuerpo);
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn("No se pudo mostrar la notificación local:", err.message);
    Alert.alert(titulo, cuerpo);
    return false;
  }
}

// Réplica de la regla del motor de mantenimiento del backend (routeController),
// para poder avisar cuando el recorrido se termina sin conexión.
// Si cambian las fórmulas o los umbrales en el backend, actualizar también acá.
export function evaluarMantenimientoLocal({ distanciaKm, desnivelM, terreno, clima, estiloConduccion }) {
  const km = Number(distanciaKm) || 0;
  const desnivel = Number(desnivelM) || 0;

  const base = km * 0.004 + desnivel * 0.0001;
  const multClima = { lluvia: 1.5, nieve: 2.0, nublado: 1.1 }[clima] ?? 1.0;
  const multEstilo = { suave: 0.8, agresivo: 1.3 }[estiloConduccion] ?? 1.0;
  const multTerreno = { asfalto: 0.9, montaña: 1.4, tierra: 1.4 }[terreno] ?? 1.0;

  const indiceDesgaste = parseFloat((base * multClima * multEstilo * multTerreno).toFixed(3));

  return {
    indiceDesgaste,
    alertaGenerada: km > 15 || indiceDesgaste > 0.08,
  };
}