// src/screens/StatsScreen.js
// Pantalla de estadísticas: muestra el resumen general del usuario
// (GET /stats/summary): recorridos totales, distancia y desnivel acumulados.

import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getStatsSummary } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargarStats() {
    setCargando(true);
    try {
      const data = await getStatsSummary();
      setStats(data);
    } catch (err) {
      Alert.alert("Error", "No se pudieron cargar las estadísticas.");
    } finally {
      setCargando(false);
    }
  }

  // Recarga cada vez que se entra a esta pestaña (ej: después de un recorrido nuevo)
  useFocusEffect(
    React.useCallback(() => {
      cargarStats();
    }, [])
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primario} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mis estadísticas</Text>

      <View style={styles.card}>
        <Feather name="map" size={28} color={colors.primario} />
        <Text style={styles.numero}>{stats?.totalRecorridos ?? 0}</Text>
        <Text style={styles.label}>Recorridos totales</Text>
      </View>

      <View style={styles.card}>
        <Feather name="navigation" size={28} color={colors.primario} />
        <Text style={styles.numero}>{stats?.distanciaTotalKm ?? 0} km</Text>
        <Text style={styles.label}>Distancia total</Text>
      </View>

      <View style={styles.card}>
        <Feather name="trending-up" size={28} color={colors.primario} />
        <Text style={styles.numero}>{stats?.desnivelTotalM ?? 0} m</Text>
        <Text style={styles.label}>Desnivel total</Text>
      </View>
    </View>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fondo, padding: 16, paddingTop: 50 },
    titulo: { fontFamily: "Poppins_700Bold", fontSize: 22, marginBottom: 20, color: colors.primario },
    card: {
      borderWidth: 1,
      borderColor: colors.bordeSuave,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      marginBottom: 16,
      backgroundColor: colors.superficie,
    },
    numero: { fontFamily: "Poppins_700Bold", fontSize: 28, marginTop: 8, color: colors.texto },
    label: { fontFamily: "Poppins_400Regular", color: colors.textoSecundario, marginTop: 4 },
  });
}