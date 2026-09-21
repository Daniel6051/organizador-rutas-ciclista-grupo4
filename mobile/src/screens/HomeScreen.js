// src/screens/HomeScreen.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
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
import { Feather } from "@expo/vector-icons";
import {
  startRoute,
  sendRoutePoints,
  finishRoute,
  getBikes,
  planRoute,
  reportIncident,
  getIncidents,
} from "../services/api";
import { calcularDistanciaKm, calcularDesnivelM } from "../services/geo";
import { guardarPuntoLocal, guardarRutaLocal, actualizarRutaLocal, cachearBicis, obtenerBicisCache } from "../services/db";
import { sincronizarRuta, sincronizarRutasPendientes } from "../services/sync";
import {
  registrarNotificaciones,
  suscribirseANotificaciones,
  notificarLocal,
  evaluarMantenimientoLocal,
} from "../services/notifications";
import { hayConexion, escucharConexion } from "../services/network";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const MENDOZA_REGION = {
  latitude: -32.8908,
  longitude: -68.8272,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const COLOR_CELESTE = "#00b4d8";

// Estilo de Google Maps para modo oscuro (JSON estándar de Google, el mismo
// que usan la mayoría de las apps con tema noche). Se aplica solo cuando
// isDark es true; en tema claro el mapa queda con el estilo default de Google.
const MAP_STYLE_OSCURO = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

const TIPOS_INCIDENTE = [
  ["bache", "🕳️ Bache"],
  ["corte_calle", "🚧 Corte de calle"],
  ["obra", "🏗️ Obra"],
  ["inseguridad", "⚠️ Inseguridad"],
  ["semaforo_roto", "🚦 Semáforo roto"],
  ["otro", "❗ Otro"],
];

const ICONOS_INCIDENTE = {
  bache: "🕳️",
  corte_calle: "🚧",
  obra: "🏗️",
  inseguridad: "⚠️",
  semaforo_roto: "🚦",
  otro: "❗",
};

function formatearDuracion(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, "0");
  const s = Math.floor(segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

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
    <View style={estilosMarcador.marcadorContainer}>
      <Animated.View style={[estilosMarcador.pulso, { transform: [{ scale: escala }], opacity: opacidad }]} />
      <View style={estilosMarcador.puntoBici}>
        <Text style={estilosMarcador.emojiBici}>🚴</Text>
      </View>
    </View>
  );
}

// El pin del mapa se deja con un celeste fijo a propósito: se lee bien
// tanto sobre el mapa claro como sobre el oscuro, y no depende del tema
// de la app sino del estilo del mapa en sí.
const estilosMarcador = StyleSheet.create({
  marcadorContainer: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  pulso: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: COLOR_CELESTE },
  puntoBici: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLOR_CELESTE, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", elevation: 3 },
  emojiBici: { fontSize: 15 },
});

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark, toggleTema } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [permisoOk, setPermisoOk] = useState(false);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [posicionActual, setPosicionActual] = useState(null);
  const [recorridoActivo, setRecorridoActivo] = useState(false);
  const [routeId, setRouteId] = useState(null);
  const [esRutaOffline, setEsRutaOffline] = useState(false);
  const [puntos, setPuntos] = useState([]);
  const [duracionSeg, setDuracionSeg] = useState(0);
  const [online, setOnline] = useState(true);

  const [bicis, setBicis] = useState([]);
  const [biciSeleccionada, setBiciSeleccionada] = useState(null);
  const [cargandoBicis, setCargandoBicis] = useState(true);

  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const [clima, setClima] = useState("soleado");
  const [estiloConduccion, setEstiloConduccion] = useState("moderado");

  // Planificación de rutas (Módulo 3)
  const [modoPlanificar, setModoPlanificar] = useState(false);
  const [destinoPlan, setDestinoPlan] = useState(null);
  const [rutaPlanificada, setRutaPlanificada] = useState(null);
  const [calculandoRuta, setCalculandoRuta] = useState(false);

  // Reporte de incidentes (Módulo 3)
  const [incidentes, setIncidentes] = useState([]);
  const [modoReportar, setModoReportar] = useState(false);
  const [ubicacionIncidente, setUbicacionIncidente] = useState(null);
  const [tipoIncidente, setTipoIncidente] = useState(null);
  const [descripcionIncidente, setDescripcionIncidente] = useState("");
  const [reportando, setReportando] = useState(false);

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
      const conexion = await hayConexion();
      if (conexion) {
        const lista = await getBikes();
        setBicis(lista);
        await cachearBicis(lista);
        if (lista.length > 0) setBiciSeleccionada(lista[0].id);
      } else {
        // Sin conexión: usar cache local
        const cache = await obtenerBicisCache();
        setBicis(cache);
        if (cache.length > 0) setBiciSeleccionada(cache[0].id);
      }
    } catch (err) {
      // Si falla la API, intentar cache
      try {
        const cache = await obtenerBicisCache();
        setBicis(cache);
        if (cache.length > 0) setBiciSeleccionada(cache[0].id);
      } catch {
        console.warn("No se pudieron cargar las bicicletas.");
      }
    } finally {
      setCargandoBicis(false);
    }
  }

  async function cargarIncidentes() {
    try {
      const lista = await getIncidents();
      setIncidentes(lista);
    } catch (err) {
      console.warn("No se pudieron cargar los incidentes:", err.message);
    }
  }

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

    // Escuchar cambios de conectividad
    const quitarEscucha = escucharConexion(async (state) => {
      const conectado = state.isConnected && state.isInternetReachable;
      setOnline(conectado);
      if (conectado) {
        // Cuando vuelve la conexión, sincronizar rutas pendientes
        const sincronizadas = await sincronizarRutasPendientes();
        if (sincronizadas > 0) {
          notificarLocal(
            "Sincronización completada",
            `Se sincronizaron ${sincronizadas} recorrido(s) guardado(s) offline.`
          );
        }
      }
    });

    return () => {
      if (watchSubscription.current) watchSubscription.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      quitarSuscripcion();
      quitarEscucha();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      cargarBicis();
      cargarIncidentes();
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

  function activarPlanificar() {
    setModoReportar(false);
    setUbicacionIncidente(null);
    setTipoIncidente(null);
    setDescripcionIncidente("");
    setModoPlanificar(true);
  }

  function activarReportar() {
    setModoPlanificar(false);
    setDestinoPlan(null);
    setRutaPlanificada(null);
    setModoReportar(true);
  }

  async function handleTocarMapa(event) {
  const { latitude, longitude } = event.nativeEvent.coordinate;
  console.log('📍 Coordenadas tocadas:', latitude, longitude); // TEMPORAL, borrar después

  if (modoPlanificar) {
      if (!posicionActual) {
        Alert.alert("Ubicación no disponible", "Esperá a que se detecte tu posición actual.");
        return;
      }

      setDestinoPlan({ latitude, longitude });
      setRutaPlanificada(null);
      setCalculandoRuta(true);

      try {
        const resultado = await planRoute({
          origen: { lat: posicionActual.latitude, lng: posicionActual.longitude },
          destino: { lat: latitude, lng: longitude },
        });
        setRutaPlanificada(resultado);
      } catch (err) {
        Alert.alert("No se pudo calcular la ruta", err.message);
        setDestinoPlan(null);
      } finally {
        setCalculandoRuta(false);
      }
    } else if (modoReportar) {
      setUbicacionIncidente({ latitude, longitude });
    }
  }

  function cancelarPlanificacion() {
    setModoPlanificar(false);
    setDestinoPlan(null);
    setRutaPlanificada(null);
  }

  function cancelarReporte() {
    setModoReportar(false);
    setUbicacionIncidente(null);
    setTipoIncidente(null);
    setDescripcionIncidente("");
  }

  async function handleEnviarIncidente() {
    if (!tipoIncidente) {
      Alert.alert("Elegí un tipo", "Seleccioná qué tipo de incidente es antes de enviar.");
      return;
    }
    if (!ubicacionIncidente) {
      Alert.alert("Falta la ubicación", "Tocá el mapa para marcar dónde ocurrió.");
      return;
    }

    setReportando(true);
    try {
      const nuevo = await reportIncident({
        tipo: tipoIncidente,
        descripcion: descripcionIncidente || null,
        lat: ubicacionIncidente.latitude,
        lng: ubicacionIncidente.longitude,
      });
      setIncidentes((prev) => [nuevo, ...prev]);
      Alert.alert("¡Gracias!", "Tu reporte fue enviado y ya es visible para otros ciclistas.");
      cancelarReporte();
    } catch (err) {
      Alert.alert("No se pudo enviar el reporte", err.message);
    } finally {
      setReportando(false);
    }
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
      const conexion = await hayConexion();
      let idRuta;
      let offline = false;

      if (conexion) {
        // Online: crear ruta en el backend
        const route = await startRoute({ bikeId: biciSeleccionada });
        idRuta = route.id;
      } else {
        // Offline: crear ruta localmente con ID temporal
        idRuta = uuidv4();
        offline = true;
        await guardarRutaLocal({
          localId: idRuta,
          bikeId: biciSeleccionada,
          inicio: new Date().toISOString(),
          clima,
          estilo_conduccion: estiloConduccion,
        });
        Alert.alert(
          "Modo offline",
          "No hay conexión. El recorrido se guardará localmente y se sincronizará cuando vuelva la señal."
        );
      }

      setRouteId(idRuta);
      setEsRutaOffline(offline);
      setPuntos([]);
      setDuracionSeg(0);
      setRecorridoActivo(true);

      timerRef.current = setInterval(() => {
        setDuracionSeg((prev) => prev + 1);
      }, 1000);

      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          // TEMPORAL, borrar después de confirmar si el GPS manda altitud real.
          // Si ves "null" o "undefined" acá durante todo el recorrido, el
          // sensor de altitud del dispositivo no está entregando dato (común
          // en emuladores, o con mala señal GPS/cielo tapado).
          console.log(
            '🏔️ altitud:', loc.coords.altitude,
            '| precisión altitud:', loc.coords.altitudeAccuracy,
            '| precisión posición:', loc.coords.accuracy
          );

          const nuevoPunto = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            altitud: loc.coords.altitude,
            timestamp: new Date().toISOString(),
          };
          setPosicionActual(loc.coords);
          setPuntos((prev) => [...prev, nuevoPunto]);
          guardarPuntoLocal(idRuta, nuevoPunto);
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
    const distanciaKm = calcularDistanciaKm(puntos);
    const desnivelM = calcularDesnivelM(puntos);

    try {
      if (esRutaOffline) {
        // Guardar datos finales de la ruta offline
        await actualizarRutaLocal(routeId, {
          fin: new Date().toISOString(),
          distanciaKm,
          desnivelM,
          terreno: "mixto",
        });
        setRecorridoActivo(false);
        await notificarLocal(
          "Recorrido guardado offline",
          `Duración: ${formatearDuracion(duracionSeg)} — Distancia: ${distanciaKm} km — Desnivel: ${desnivelM} m.\nSe sincronizará cuando vuelva la conexión.`
        );

        // Sin conexión no hay backend que evalúe el desgaste: se evalúa acá
        const { alertaGenerada } = evaluarMantenimientoLocal({
          distanciaKm,
          desnivelM,
          terreno: "mixto",
          clima,
          estiloConduccion,
        });
        if (alertaGenerada) {
          await notificarLocal(
            "Alerta de mantenimiento",
            "Tu recorrido fue exigente: revisá cadena, frenos y neumáticos."
          );
        }
      } else {
        // Online: sincronizar puntos y finalizar
        try {
          await sincronizarRuta(routeId);
        } catch (err) {
          console.warn("Sin señal al finalizar:", err.message);
        }

        const resultado = await finishRoute(routeId, {
          distanciaKm,
          desnivelM,
          terreno: "mixto",
          clima,
          estilo_conduccion: estiloConduccion,
        });
        setRecorridoActivo(false);

        const alerta = resultado.evaluacionMantenimiento?.alertaGenerada;
        Alert.alert(
          "Recorrido finalizado",
          `Duración: ${formatearDuracion(duracionSeg)} — Distancia: ${distanciaKm} km — Desnivel: ${desnivelM} m.\n` +
            (alerta ? "Se generó una alerta de mantenimiento para tu bici." : "Recorrido guardado correctamente.")
        );
      }
    } catch (err) {
      Alert.alert(
        "No se pudo finalizar el recorrido",
        `${err.message}\n\nTus puntos GPS no se perdieron, podés reintentar.`
      );
    } finally {
      setFinalizando(false);
    }
  }

  if (permisoDenegado) {
    return (
      <View style={styles.permisoContainer}>
        <Text style={styles.permisoTitulo}>Necesitamos tu ubicación</Text>
        <Text style={styles.permisoTexto}>
          Sin acceso a la ubicación no podemos trackear tus recorridos en el mapa.
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
        <View style={styles.headerDerecha}>
          {!online && (
            <View style={styles.badgeOffline}>
              <Text style={styles.badgeOfflineTexto}>📵 Sin conexión</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.botonTema}
            accessibilityLabel="Abrir mi perfil"
          >
            <Feather name="user" size={20} color={colors.texto} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleTema}
            style={styles.botonTema}
            accessibilityLabel={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          >
            <Feather name={isDark ? "sun" : "moon"} size={20} color={colors.texto} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.logout}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!recorridoActivo && (
        <View style={styles.selectorBicis}>
          {cargandoBicis ? (
            <ActivityIndicator color={colors.primario} />
          ) : bicis.length === 0 ? (
            <Text style={styles.sinBicis}>No tenés bicicletas cargadas todavía.</Text>
          ) : (
            <FlatList
              horizontal
              data={bicis}
              keyExtractor={(b) => String(b.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chipBici, item.id === biciSeleccionada && styles.chipBiciActiva]}
                  onPress={() => setBiciSeleccionada(item.id)}
                >
                  <Text style={[styles.chipBiciTexto, item.id === biciSeleccionada && styles.chipBiciTextoActivo]}>
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
          onPress={handleTocarMapa}
          customMapStyle={isDark ? MAP_STYLE_OSCURO : []}
        >
          {posicionActual && (
            <Marker
              coordinate={{ latitude: posicionActual.latitude, longitude: posicionActual.longitude }}
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
          {destinoPlan && (
            <Marker coordinate={destinoPlan} title="Destino" pinColor="orange" />
          )}
          {rutaPlanificada?.geojson?.coordinates && (
            <Polyline
              coordinates={rutaPlanificada.geojson.coordinates.map(([lng, lat]) => ({
                latitude: lat,
                longitude: lng,
              }))}
              strokeWidth={4}
              strokeColor="#f77f00"
            />
          )}
          {incidentes.map((inc) => (
            <Marker
              key={inc.id}
              coordinate={{ latitude: Number(inc.lat), longitude: Number(inc.lng) }}
              title={ICONOS_INCIDENTE[inc.tipo] + " " + inc.tipo.replace("_", " ")}
              description={inc.descripcion || undefined}
            >
              <View style={styles.pinIncidente}>
                <Text style={styles.pinIncidenteTexto}>{ICONOS_INCIDENTE[inc.tipo] || "❗"}</Text>
              </View>
            </Marker>
          ))}
          {ubicacionIncidente && (
            <Marker coordinate={ubicacionIncidente} title="Incidente a reportar" pinColor="red" />
          )}
        </MapView>
        <TouchableOpacity style={styles.botonCentrar} onPress={centrarEnMiUbicacion}>
          <Text style={styles.botonCentrarTexto}>◎</Text>
        </TouchableOpacity>
      </View>

      {!recorridoActivo && (
        <View style={styles.panelPlan}>
          {!modoPlanificar && !modoReportar && (
            <View style={styles.filaBotonesModo}>
              <TouchableOpacity style={styles.botonModo} onPress={activarPlanificar}>
                <Text style={styles.botonModoTexto}>📍 Planificar ruta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonModo} onPress={activarReportar}>
                <Text style={styles.botonModoTexto}>🚧 Reportar incidente</Text>
              </TouchableOpacity>
            </View>
          )}

          {modoPlanificar && (
            <>
              <Text style={styles.planInfo}>
                {calculandoRuta
                  ? "Calculando mejor ruta..."
                  : rutaPlanificada
                  ? `${rutaPlanificada.distanciaKm} km — ${Math.round(rutaPlanificada.duracionMin)} min`
                  : "Tocá el mapa para elegir tu destino"}
              </Text>
              <TouchableOpacity style={styles.botonCancelarPlan} onPress={cancelarPlanificacion}>
                <Text style={styles.botonCancelarPlanTexto}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          {modoReportar && (
            <>
              <Text style={styles.planInfo}>
                {ubicacionIncidente ? "Elegí el tipo de incidente:" : "Tocá el mapa para marcar dónde pasó"}
              </Text>

              {ubicacionIncidente && (
                <>
                  <View style={styles.selectorRow}>
                    {TIPOS_INCIDENTE.map(([val, label]) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.chipBici, tipoIncidente === val && styles.chipBiciActiva]}
                        onPress={() => setTipoIncidente(val)}
                      >
                        <Text style={[styles.chipBiciTexto, tipoIncidente === val && styles.chipBiciTextoActivo]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.inputDescripcion}
                    placeholder="Descripción opcional..."
                    placeholderTextColor={colors.textoTenue}
                    value={descripcionIncidente}
                    onChangeText={setDescripcionIncidente}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.botonIniciar, reportando && styles.botonDeshabilitado]}
                    onPress={handleEnviarIncidente}
                    disabled={reportando}
                  >
                    {reportando ? (
                      <ActivityIndicator color={colors.primarioTexto} />
                    ) : (
                      <Text style={styles.botonTexto}>Enviar reporte</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.botonCancelarPlan} onPress={cancelarReporte}>
                <Text style={styles.botonCancelarPlanTexto}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.panel}>
        {!recorridoActivo ? (
          <TouchableOpacity
            style={[styles.botonIniciar, iniciando && styles.botonDeshabilitado]}
            onPress={handleIniciarRecorrido}
            disabled={iniciando}
          >
            {iniciando ? <ActivityIndicator color={colors.primarioTexto} /> : <Text style={styles.botonTexto}>Iniciar recorrido</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.puntosInfo}>
              {formatearDuracion(duracionSeg)} — {calcularDistanciaKm(puntos)} km — {puntos.length} puntos
              {esRutaOffline && " 📵"}
            </Text>

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
              {finalizando ? <ActivityIndicator color={colors.primarioTexto} /> : <Text style={styles.botonTexto}>Finalizar recorrido</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fondo },
    permisoContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: colors.fondo },
    permisoTitulo: { fontFamily: "Poppins_700Bold", fontSize: 20, marginBottom: 12, textAlign: "center", color: colors.primario },
    permisoTexto: { fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.textoSecundario, textAlign: "center", marginBottom: 24 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 50, backgroundColor: colors.fondo },
    headerDerecha: { flexDirection: "row", alignItems: "center", gap: 10 },
    saludo: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.texto },
    logout: { fontFamily: "Poppins_400Regular", color: colors.peligro },
    botonTema: { padding: 2 },
    badgeOffline: { backgroundColor: colors.advertencia, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
    badgeOfflineTexto: { fontFamily: "Poppins_600SemiBold", color: "#fff", fontSize: 11 },
    selectorBicis: { paddingHorizontal: 16, paddingBottom: 10, minHeight: 40 },
    sinBicis: { fontFamily: "Poppins_400Regular", color: colors.textoTenue, fontStyle: "italic" },
    chipBici: { borderWidth: 1, borderColor: colors.primario, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 6 },
    chipBiciActiva: { backgroundColor: colors.primario },
    chipBiciTexto: { fontFamily: "Poppins_600SemiBold", color: colors.primario },
    chipBiciTextoActivo: { color: colors.primarioTexto },
    mapWrapper: { flex: 1 },
    map: { flex: 1 },
    botonCentrar: { position: "absolute", bottom: 16, right: 16, backgroundColor: colors.superficie, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 4 },
    botonCentrarTexto: { fontSize: 20, color: colors.primario },
    pinIncidente: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.superficie, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.advertencia, elevation: 3 },
    pinIncidenteTexto: { fontSize: 15 },
    panelPlan: { padding: 12, borderTopWidth: 1, borderTopColor: colors.bordeSuave, backgroundColor: colors.fondo },
    filaBotonesModo: { flexDirection: "row", gap: 8 },
    botonModo: { flex: 1, backgroundColor: colors.superficie, borderWidth: 1, borderColor: colors.primario, borderRadius: 8, padding: 12, alignItems: "center" },
    botonModoTexto: { fontFamily: "Poppins_600SemiBold", color: colors.primario, fontSize: 12, textAlign: "center" },
    planInfo: { fontFamily: "Poppins_400Regular", textAlign: "center", marginBottom: 8, color: colors.textoSecundario },
    inputDescripcion: { fontFamily: "Poppins_400Regular", borderWidth: 1, borderColor: colors.bordeSuave, borderRadius: 8, padding: 10, minHeight: 44, color: colors.texto, marginBottom: 10, textAlignVertical: "top" },
    botonCancelarPlan: { backgroundColor: colors.peligro, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
    botonCancelarPlanTexto: { fontFamily: "Poppins_600SemiBold", color: "#fff" },
    panel: { padding: 16, borderTopWidth: 1, borderTopColor: colors.bordeSuave, backgroundColor: colors.fondo },
    puntosInfo: { fontFamily: "Poppins_400Regular", textAlign: "center", marginBottom: 8, color: colors.textoSecundario },
    botonIniciar: { backgroundColor: colors.primario, borderRadius: 8, padding: 16, alignItems: "center" },
    botonFinalizar: { backgroundColor: colors.peligro, borderRadius: 8, padding: 16, alignItems: "center" },
    selectorLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.textoSecundario, marginBottom: 4, marginTop: 8 },
    selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
    botonDeshabilitado: { opacity: 0.6 },
    botonTexto: { fontFamily: "Poppins_700Bold", color: colors.primarioTexto, fontSize: 16 },
  });
}