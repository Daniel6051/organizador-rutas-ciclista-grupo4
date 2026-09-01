// src/screens/HomeScreen.js
// Pantalla principal: pide permisos de ubicación, muestra el mapa centrado
// en la posición actual (con un marcador de bici animado con pulso), permite
// elegir la bicicleta activa, y arranca/finaliza un recorrido trackeando los
// puntos GPS mientras la app está abierta. También registra el dispositivo
// para notificaciones push y escucha las que lleguen.
//
// Requiere:
//   npx expo install expo-location react-native-maps
//   npx expo install expo-notifications expo-device expo-constants

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { startRoute, sendRoutePoints, finishRoute, getBikes } from "../services/api";
import { calcularDistanciaKm, calcularDesnivelM } from "../services/geo";
import { guardarPuntoLocal } from "../services/db";
import { sincronizarRuta } from "../services/sync";
import { registrarNotificaciones, suscribirseANotificaciones } from "../services/notifications";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

// Coordenadas iniciales de referencia: Mendoza Capital
const MENDOZA_REGION = {
  latitude: -32.8908,
  longitude: -68.8272,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const COLOR_CELESTE = "#00b4d8";

function formatearDuracion(segundos) {
  const m = Math.floor(segundos / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(segundos % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// Marcador de posición: bici sobre un círculo celeste que pulsa (crece y se
// desvanece en loop), en vez del punto azul nativo de react-native-maps.
function MarcadorBiciAnimado() {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.timing(pulso, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso]);

  const escala = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacidad = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.marcadorContainer}>
      <Animated.View
        style={[
          styles.pulso,
          { transform: [{ scale: escala }], opacity: opacidad },
        ]}
      />
      <View style={styles.puntoBici}>
        <Text style={styles.emojiBici}>🚴</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const [permisoOk, setPermisoOk] = useState(false);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [posicionActual, setPosicionActual] = useState(null);
  const [recorridoActivo, setRecorridoActivo] = useState(false);
  const [routeId, setRouteId] = useState(null);
  const [puntos, setPuntos] = useState([]);
  const [duracionSeg, setDuracionSeg] = useState(0);

  const [bicis, setBicis] = useState([]);
  const [biciSeleccionada, setBiciSeleccionada] = useState(null);
  const [cargandoBicis, setCargandoBicis] = useState(true);

  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // Selectores para el motor de mantenimiento ponderado (Tormo)
  const [clima, setClima] = useState("soleado");
  const [estiloConduccion, setEstiloConduccion] = useState("moderado");

  const watchSubscription = useRef(null);
  const mapRef = useRef(null);
  const timerRef = useRef(null);

  async function pedirPermisoUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermisoOk(false);
      setPermisoDenegado(true);
      return;
    }
    setPermisoOk(true);
    setPermisoDenegado(false);
    const pos = await Location.getCurrentPositionAsync({});
    setPosicionActual(pos.coords);
  }

  async function cargarBicis() {
    setCargandoBicis(true);
    try {
      const lista = await getBikes();
      setBicis(lista);
      if (lista.length > 0) setBiciSeleccionada(lista[0].id);
    } catch (err) {
      console.warn("No se pudieron cargar las bicicletas:", err.message);
    } finally {
      setCargandoBicis(false);
    }
  }

  // Pedir permisos de ubicación al entrar, registrar notificaciones,
  // y limpiar suscripciones al salir
  useEffect(() => {
    pedirPermisoUbicacion();

    if (user?.id) {
      registrarNotificaciones(user.id);
    }

    const quitarSuscripcion = suscribirseANotificaciones((notificacion) => {
      const titulo = notificacion.request.content.title || "Notificación";
      const cuerpo = notificacion.request.content.body || "";
      Alert.alert(titulo, cuerpo);
    });

    return () => {
      if (watchSubscription.current) watchSubscription.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      quitarSuscripcion();
    };
  }, []);

  // Recargar bicis cada vez que se vuelve a esta pestaña (ej: después de crear una)
  useFocusEffect(
    React.useCallback(() => {
      cargarBicis();
    }, [])
  );

  function centrarEnMiUbicacion() {
    if (!posicionActual || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: posicionActual.latitude,
        longitude: posicionActual.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  }

  async function handleIniciarRecorrido() {
    if (!permisoOk) {
      Alert.alert("Sin permiso", "Habilitá la ubicación para poder iniciar un recorrido.");
      return;
    }
    if (!biciSeleccionada) {
      Alert.alert("Elegí una bicicleta", "Seleccioná con qué bici vas a salir antes de arrancar.");
      return;
    }

    setIniciando(true);
    try {
      const route = await startRoute({ bikeId: biciSeleccionada });
      setRouteId(route.id);
      setPuntos([]);
      setDuracionSeg(0);
      setRecorridoActivo(true);

      // Cronómetro de duración del recorrido
      timerRef.current = setInterval(() => {
        setDuracionSeg((prev) => prev + 1);
      }, 1000);

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
          guardarPuntoLocal(route.id, nuevoPunto);
        }
      );
    } catch (err) {
      Alert.alert("No se pudo iniciar el recorrido", err.message);
    } finally {
      setIniciando(false);
    }
  }

  async function handleFinalizarRecorrido() {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFinalizando(true);
    try {
      try {
        await sincronizarRuta(routeId);
      } catch (err) {
        console.warn("Sin señal, los puntos quedaron guardados para sincronizar después:", err.message);
      }

      // Cálculo real a partir de los puntos GPS registrados, en vez de
      // dejar que el mock invente los valores.
      const distanciaKm = calcularDistanciaKm(puntos);
      const desnivelM = calcularDesnivelM(puntos);

      const resultado = await finishRoute(routeId, {
        distanciaKm,
        desnivelM,
        terreno: "mixto", // TODO: derivar del perfil de bici cuando esté disponible
        clima,
        estilo_conduccion: estiloConduccion,
      });
      setRecorridoActivo(false);

      const alerta = resultado.evaluacionMantenimiento?.alertaGenerada;
      Alert.alert(
        "Recorrido finalizado",
        `Duración: ${formatearDuracion(duracionSeg)} — Distancia: ${distanciaKm} km — Desnivel: ${desnivelM} m.\n` +
          (alerta
            ? "Se generó una alerta de mantenimiento para tu bici."
            : "Recorrido guardado correctamente.")
      );
    } catch (err) {
      // Si falla el finish, dejamos recorridoActivo=true para que el usuario pueda reintentar
      // sin perder los puntos ya trackeados.
      Alert.alert(
        "No se pudo finalizar el recorrido",
        `${err.message}\n\nTus puntos GPS no se perdieron, podés reintentar.`
      );
    } finally {
      setFinalizando(false);
    }
  }

  // ---------- Pantalla de permiso denegado ----------
  if (permisoDenegado) {
    return (
      <View style={styles.permisoContainer}>
        <Text style={styles.permisoTitulo}>Necesitamos tu ubicación</Text>
        <Text style={styles.permisoTexto}>
          Sin acceso a la ubicación no podemos trackear tus recorridos en el mapa.
          Habilitá el permiso para seguir.
        </Text>
        <TouchableOpacity style={styles.botonIniciar} onPress={pedirPermisoUbicacion}>
          <Text style={styles.botonTexto}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut} style={{ marginTop: 16 }}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.saludo}>Hola, {user?.nombre || user?.email}</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {!recorridoActivo && (
        <View style={styles.selectorBicis}>
          {cargandoBicis ? (
            <ActivityIndicator />
          ) : bicis.length === 0 ? (
            <Text style={styles.sinBicis}>No tenés bicicletas cargadas todavía.</Text>
          ) : (
            <FlatList
              horizontal
              data={bicis}
              keyExtractor={(b) => b.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.chipBici,
                    item.id === biciSeleccionada && styles.chipBiciActiva,
                  ]}
                  onPress={() => setBiciSeleccionada(item.id)}
                >
                  <Text
                    style={[
                      styles.chipBiciTexto,
                      item.id === biciSeleccionada && styles.chipBiciTextoActivo,
                    ]}
                  >
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={MENDOZA_REGION}
          showsUserLocation={false}
        >
          {posicionActual && (
            <Marker
              coordinate={{
                latitude: posicionActual.latitude,
                longitude: posicionActual.longitude,
              }}
              title="Tu posición"
              anchor={{ x: 0.5, y: 0.5 }}
              flat
            >
              <MarcadorBiciAnimado />
            </Marker>
          )}

          {puntos.length > 1 && (
            <Polyline
              coordinates={puntos.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeWidth={4}
            />
          )}
        </MapView>

        <TouchableOpacity style={styles.botonCentrar} onPress={centrarEnMiUbicacion}>
          <Text style={styles.botonCentrarTexto}>◎</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        {!recorridoActivo ? (
          <TouchableOpacity
            style={[styles.botonIniciar, iniciando && styles.botonDeshabilitado]}
            onPress={handleIniciarRecorrido}
            disabled={iniciando}
          >
            {iniciando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Iniciar recorrido</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.puntosInfo}>
              {formatearDuracion(duracionSeg)} — {calcularDistanciaKm(puntos)} km — {puntos.length} puntos
            </Text>

            {/* Selector de clima — alimenta el multiplicador del motor ponderado */}
            <Text style={styles.selectorLabel}>Clima durante el recorrido:</Text>
            <View style={styles.selectorRow}>
              {[["soleado", "☀️"], ["nublado", "🌥️"], ["lluvia", "🌧️"], ["nieve", "❄️"]].map(([val, emoji]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chipBici, clima === val && styles.chipBiciActiva]}
                  onPress={() => setClima(val)}
                >
                  <Text style={[styles.chipBiciTexto, clima === val && styles.chipBiciTextoActivo]}>
                    {emoji} {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector de estilo de conducción */}
            <Text style={styles.selectorLabel}>Estilo de conducción:</Text>
            <View style={styles.selectorRow}>
              {[["suave", "🟢"], ["moderado", "🟡"], ["agresivo", "🔴"]].map(([val, emoji]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chipBici, estiloConduccion === val && styles.chipBiciActiva]}
                  onPress={() => setEstiloConduccion(val)}
                >
                  <Text style={[styles.chipBiciTexto, estiloConduccion === val && styles.chipBiciTextoActivo]}>
                    {emoji} {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.botonFinalizar, finalizando && styles.botonDeshabilitado]}
              onPress={handleFinalizarRecorrido}
              disabled={finalizando}
            >
              {finalizando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonTexto}>Finalizar recorrido</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  permisoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  permisoTitulo: { fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  permisoTexto: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  saludo: { fontSize: 16, fontWeight: "600" },
  logout: { color: "#c0392b" },
  selectorBicis: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    minHeight: 40,
  },
  sinBicis: { color: "#888", fontStyle: "italic" },
  chipBici: {
    borderWidth: 1,
    borderColor: "#2e7d32",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipBiciActiva: { backgroundColor: "#2e7d32" },
  chipBiciTexto: { color: "#2e7d32", fontWeight: "600" },
  chipBiciTextoActivo: { color: "#fff" },
  mapWrapper: { flex: 1 },
  map: { flex: 1 },
  // ---------- Marcador de bici animado ----------
  marcadorContainer: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  pulso: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLOR_CELESTE,
  },
  puntoBici: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLOR_CELESTE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  emojiBici: { fontSize: 15 },
  botonCentrar: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  botonCentrarTexto: { fontSize: 20, color: "#2e7d32" },
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
  selectorLabel: { fontSize: 12, color: "#555", marginBottom: 4, marginTop: 8 },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});