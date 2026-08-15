// src/screens/HomeScreen.js
// Pantalla principal: pide permisos de ubicación, muestra el mapa centrado
// en la posición actual, y permite iniciar/finalizar un recorrido mientras
// va trackeando los puntos GPS en segundo plano (mientras la app está abierta).
//
// Requiere:
//   npx expo install expo-location react-native-maps

import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { startRoute, sendRoutePoints, finishRoute } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Coordenadas iniciales de referencia: Mendoza Capital
const MENDOZA_REGION = {
  latitude: -32.8908,
  longitude: -68.8272,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const [permisoOk, setPermisoOk] = useState(false);
  const [posicionActual, setPosicionActual] = useState(null);
  const [recorridoActivo, setRecorridoActivo] = useState(false);
  const [routeId, setRouteId] = useState(null);
  const [puntos, setPuntos] = useState([]);

  const watchSubscription = useRef(null);

  // Pedir permisos de ubicación al entrar a la pantalla
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso de ubicación",
          "La app necesita acceso a tu ubicación para trackear los recorridos."
        );
        return;
      }
      setPermisoOk(true);

      const pos = await Location.getCurrentPositionAsync({});
      setPosicionActual(pos.coords);
    })();

    // Al desmontar la pantalla, asegurarse de cortar el tracking
    return () => {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, []);

  async function handleIniciarRecorrido() {
    if (!permisoOk) {
      Alert.alert("Sin permiso", "Habilitá la ubicación para poder iniciar un recorrido.");
      return;
    }
    try {
      const route = await startRoute({ bikeId: null }); // TODO: usar bikeId real cuando exista selector de bici
      setRouteId(route.id);
      setPuntos([]);
      setRecorridoActivo(true);

      // Trackeo continuo de posición mientras el recorrido está activo
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // cada 5 segundos
          distanceInterval: 10, // o cada 10 metros
        },
        (loc) => {
          const nuevoPunto = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            altitud: loc.coords.altitude,
            timestamp: new Date().toISOString(),
          };
          setPosicionActual(loc.coords);
          setPuntos((prev) => [...prev, nuevoPunto]);
        }
      );
    } catch (err) {
      Alert.alert("No se pudo iniciar el recorrido", err.message);
    }
  }

  async function handleFinalizarRecorrido() {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }

    try {
      // Enviar los puntos acumulados antes de cerrar el recorrido
      if (puntos.length > 0) {
        await sendRoutePoints(routeId, puntos);
      }
      const resultado = await finishRoute(routeId, {});
      setRecorridoActivo(false);

      const alerta = resultado.evaluacionMantenimiento?.alertaGenerada;
      Alert.alert(
        "Recorrido finalizado",
        alerta
          ? "Se generó una alerta de mantenimiento para tu bici. Revisá la sección de estadísticas."
          : "Recorrido guardado correctamente."
      );
    } catch (err) {
      Alert.alert("No se pudo finalizar el recorrido", err.message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.saludo}>Hola, {user?.nombre || user?.email}</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        initialRegion={MENDOZA_REGION}
        region={
          posicionActual
            ? {
                latitude: posicionActual.latitude,
                longitude: posicionActual.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
        showsUserLocation
      >
        {posicionActual && (
          <Marker
            coordinate={{
              latitude: posicionActual.latitude,
              longitude: posicionActual.longitude,
            }}
            title="Tu posición"
          />
        )}

        {puntos.length > 1 && (
          <Polyline
            coordinates={puntos.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeWidth={4}
          />
        )}
      </MapView>

      <View style={styles.panel}>
        {!recorridoActivo ? (
          <TouchableOpacity style={styles.botonIniciar} onPress={handleIniciarRecorrido}>
            <Text style={styles.botonTexto}>Iniciar recorrido</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.puntosInfo}>
              Puntos registrados: {puntos.length}
            </Text>
            <TouchableOpacity style={styles.botonFinalizar} onPress={handleFinalizarRecorrido}>
              <Text style={styles.botonTexto}>Finalizar recorrido</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  saludo: { fontSize: 16, fontWeight: "600" },
  logout: { color: "#c0392b" },
  map: { flex: 1 },
  panel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  puntosInfo: { textAlign: "center", marginBottom: 8, color: "#555" },
  botonIniciar: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  botonFinalizar: {
    backgroundColor: "#c0392b",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
