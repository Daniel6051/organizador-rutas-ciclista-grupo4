// src/screens/BikesScreen.js
// Pantalla de perfiles de bicicleta: solo el listado. Para agregar una
// bici nueva, el botón "+" de arriba lleva a AddBikeScreen. El lápiz de
// cada bici lleva a EditBikeScreen.

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getBikes, deleteBike } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function BikesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [bicis, setBicis] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargarBicis() {
    setCargando(true);
    try {
      const lista = await getBikes();
      setBicis(lista);
    } catch (err) {
      Alert.alert("Error", "No se pudieron cargar tus bicicletas.");
    } finally {
      setCargando(false);
    }
  }

  // Recarga la lista cada vez que volvés a esta pantalla (ej: después de agregar/editar una bici)
  useFocusEffect(
    React.useCallback(() => {
      cargarBicis();
    }, [])
  );

  function handleBorrarBici(bike) {
    Alert.alert(
      "Borrar bicicleta",
      `¿Seguro que querés borrar "${bike.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBike(bike.id);
              cargarBicis();
            } catch (err) {
              Alert.alert("No se pudo borrar", err.message);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Mis bicicletas</Text>
        <TouchableOpacity
          style={styles.botonAgregar}
          onPress={() => navigation.navigate("AddBike")}
        >
          <Text style={styles.botonAgregarTexto}>+</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.primario} />
      ) : bicis.length === 0 ? (
        <Text style={styles.sinBicis}>Todavía no tenés bicicletas cargadas.</Text>
      ) : (
        <FlatList
          data={bicis}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.cardNombre}>{item.nombre}</Text>
                <Text style={styles.cardTipo}>{item.tipo}</Text>
              </View>
              <View style={styles.acciones}>
                <TouchableOpacity
                  style={styles.iconoBoton}
                  onPress={() => navigation.navigate("EditBike", { bike: item })}
                >
                  <Feather name="edit-2" size={20} color={colors.textoSecundario} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconoBoton} onPress={() => handleBorrarBici(item)}>
                  <Feather name="trash-2" size={20} color={colors.peligro} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fondo, padding: 16, paddingTop: 50 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    titulo: { fontFamily: "Poppins_700Bold", fontSize: 22, color: colors.primario },
    botonAgregar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primario,
      alignItems: "center",
      justifyContent: "center",
    },
    botonAgregarTexto: { fontFamily: "Poppins_700Bold", color: colors.primarioTexto, fontSize: 22, lineHeight: 24 },
    sinBicis: { fontFamily: "Poppins_400Regular", color: colors.textoTenue, fontStyle: "italic", marginTop: 20 },
    card: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.bordeSuave,
      borderRadius: 8,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.superficie,
    },
    cardNombre: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.texto },
    cardTipo: { fontFamily: "Poppins_400Regular", color: colors.textoSecundario, marginTop: 2 },
    acciones: { flexDirection: "row", alignItems: "center" },
    iconoBoton: { marginLeft: 14 },
  });
}