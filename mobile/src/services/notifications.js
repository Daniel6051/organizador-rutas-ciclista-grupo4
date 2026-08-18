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
import { Platform } from "react-native";
import { registerDeviceToken } from "./api";

const esExpoGo = Constants.appOwnership === "expo";

// Config: cómo se comporta una notificación mientras la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso, genera el token de este dispositivo, y lo registra en el backend
export async function registrarNotificaciones(userId) {
  if (!Device.isDevice) {
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