// src/screens/AddBikeScreen.js
// Formulario para agregar una bicicleta nueva. Al guardar, vuelve
// automáticamente al listado (BikesScreen).

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { createBike } from "../services/api";

const TIPOS_BICI = ["Montaña", "Ruta", "Urbana", "Gravel", "BMX"];

export default function AddBikeScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState(TIPOS_BICI[0]);
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert("Falta el nombre", "Ponele un nombre a la bici.");
      return;
    }
    setGuardando(true);
    try {
      await createBike({ nombre, tipo });
      navigation.goBack();
    } catch (err) {
      Alert.alert("No se pudo crear la bici", err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nueva bicicleta</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: MTB Trek"
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={tipo} onValueChange={setTipo}>
          {TIPOS_BICI.map((t) => (
            <Picker.Item key={t} label={t} value={t} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.boton, guardando && styles.botonDeshabilitado]}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Guardar bicicleta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, paddingTop: 50 },
  titulo: { fontSize: 22, fontWeight: "bold", marginBottom: 24 },
  label: { fontSize: 14, color: "#555", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 24,
  },
  boton: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "bold" },
});