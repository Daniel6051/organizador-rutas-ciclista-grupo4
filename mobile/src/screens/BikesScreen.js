// src/screens/BikesScreen.js
// Pantalla de perfiles de bicicleta: solo el listado. Para agregar una
// bici nueva, el botón "+" de arriba lleva a AddBikeScreen. El lápiz de
// cada bici lleva a EditBikeScreen.

import React, { useEffect, useState } from "react";
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

export default function BikesScreen({ navigation }) {
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
        <ActivityIndicator style={{ marginTop: 20 }} />
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
                  <Feather name="edit-2" size={20} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconoBoton} onPress={() => handleBorrarBici(item)}>
                  <Feather name="trash-2" size={20} color="#c0392b" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titulo: { fontSize: 22, fontWeight: "bold" },
  botonAgregar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  botonAgregarTexto: { color: "#fff", fontSize: 22, fontWeight: "bold", lineHeight: 24 },
  sinBicis: { color: "#888", fontStyle: "italic", marginTop: 20 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  cardNombre: { fontSize: 16, fontWeight: "600" },
  cardTipo: { color: "#666", marginTop: 2 },
  acciones: { flexDirection: "row", alignItems: "center" },
  iconoBoton: { marginLeft: 14 },
});