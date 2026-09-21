// src/screens/HistorialScreen.js
// Historial de recorridos finalizados, con mapa miniatura del trayecto.

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getRoutes, getBikes } from "../services/api";
import { useTheme } from "../context/ThemeContext";

function dosDigitos(n) {
  return String(n).padStart(2, "0");
}

function formatearFecha(iso) {
  const d = new Date(iso);
  return `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()} — ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

function formatearDuracion(inicio, fin) {
  if (!inicio || !fin) return "—";
  const seg = Math.max(0, Math.round((new Date(fin) - new Date(inicio)) / 1000));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${dosDigitos(m)} min` : `${m} min`;
}

// El GeoJSON del backend viene como LineString con coordenadas [lng, lat]
function coordenadasDeGeojson(geojson) {
  if (geojson?.type !== "LineString" || !Array.isArray(geojson.coordinates)) return [];
  return geojson.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

// Región que abarca todo el trayecto, con un poco de margen
function regionQueAbarca(coords) {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.005),
  };
}

function TarjetaRecorrido({ ruta, nombreBici, colors, styles }) {
  const coords = useMemo(() => coordenadasDeGeojson(ruta.geojson), [ruta.geojson]);
  const region = useMemo(() => (coords.length >= 2 ? regionQueAbarca(coords) : null), [coords]);

  function dato(valor, etiqueta) {
    return (
      <View style={styles.dato}>
        <Text style={styles.datoValor}>{valor}</Text>
        <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tarjeta}>
      {/* pointerEvents none: evita que tocar el mapa abra Google Maps */}
      <View style={styles.mapaContenedor} pointerEvents="none">
        {region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            liteMode
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Polyline coordinates={coords} strokeColor={colors.primario} strokeWidth={4} />
          </MapView>
        ) : (
          <View style={styles.sinMapa}>
            <Feather name="map" size={22} color={colors.textoTenue} />
            <Text style={styles.sinMapaTexto}>Sin trazado</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.fecha}>{formatearFecha(ruta.inicio)}</Text>
        <Text style={styles.bici}>{nombreBici}</Text>
        <View style={styles.datosFila}>
          {dato(`${Number(ruta.distanciaKm || 0).toFixed(2)} km`, "Distancia")}
          {dato(formatearDuracion(ruta.inicio, ruta.fin), "Duración")}
          {dato(`${Math.round(ruta.desnivelM || 0)} m`, "Desnivel")}
        </View>
      </View>
    </View>
  );
}

export default function HistorialScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [rutas, setRutas] = useState([]);
  const [nombresBicis, setNombresBicis] = useState({});
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [listaRutas, listaBicis] = await Promise.all([getRoutes(), getBikes()]);
      // Solo recorridos terminados (los activos no tienen trazado ni métricas)
      setRutas(listaRutas.filter((r) => r.finalizado));
      const nombres = {};
      listaBicis.forEach((b) => {
        nombres[b.id] = b.nombre;
      });
      setNombresBicis(nombres);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Se recarga cada vez que la pestaña recibe el foco
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function nombreDeBici(bikeId) {
    if (bikeId === null || bikeId === undefined) return "Sin bicicleta";
    return nombresBicis[bikeId] || "Bicicleta eliminada";
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primario} />
      </View>
    );
  }

  if (error && rutas.length === 0) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.errorTitulo}>No pudimos cargar el historial</Text>
        <Text style={styles.errorTexto}>{error}</Text>
        <TouchableOpacity
          style={styles.botonReintentar}
          onPress={() => {
            setCargando(true);
            cargar();
          }}
        >
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rutas}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <TarjetaRecorrido
            ruta={item}
            nombreBici={nombreDeBici(item.bikeId)}
            colors={colors}
            styles={styles}
          />
        )}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={<Text style={styles.titulo}>Historial</Text>}
        ListEmptyComponent={
          <Text style={styles.vacio}>Todavía no tenés recorridos finalizados.</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar();
            }}
            tintColor={colors.primario}
            colors={[colors.primario]}
          />
        }
        initialNumToRender={4}
        windowSize={5}
      />
    </View>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fondo },
    centrado: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      backgroundColor: colors.fondo,
    },
    lista: { padding: 16, paddingTop: 50, paddingBottom: 24 },
    titulo: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.texto,
      marginBottom: 16,
    },
    vacio: {
      fontFamily: "Poppins_400Regular",
      color: colors.textoTenue,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 40,
    },
    tarjeta: {
      backgroundColor: colors.superficie,
      borderWidth: 1,
      borderColor: colors.bordeSuave,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 16,
    },
    mapaContenedor: { height: 140, backgroundColor: colors.bordeSuave },
    sinMapa: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
    sinMapaTexto: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.textoTenue,
    },
    info: { padding: 14 },
    fecha: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.texto },
    bici: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.textoSecundario,
      marginBottom: 12,
    },
    datosFila: { flexDirection: "row", justifyContent: "space-between" },
    dato: { alignItems: "flex-start" },
    datoValor: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.primario },
    datoEtiqueta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.textoTenue,
    },
    errorTitulo: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.texto,
      textAlign: "center",
      marginBottom: 8,
    },
    errorTexto: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.textoSecundario,
      textAlign: "center",
      marginBottom: 20,
    },
    botonReintentar: {
      backgroundColor: colors.primario,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 28,
    },
    botonReintentarTexto: {
      fontFamily: "Poppins_600SemiBold",
      color: colors.primarioTexto,
    },
  });
}
