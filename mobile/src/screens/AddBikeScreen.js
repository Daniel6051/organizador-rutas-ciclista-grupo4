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
import { useTheme } from "../context/ThemeContext";

const TIPOS_BICI = ["Montaña", "Ruta", "Urbana", "Gravel", "BMX"];

export default function AddBikeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

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
        placeholderTextColor={colors.textoTenue}
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={tipo}
          onValueChange={setTipo}
          style={{ color: colors.texto }}
          dropdownIconColor={colors.texto}
          itemStyle={{ color: colors.texto }}
        >
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
          <ActivityIndicator color={colors.primarioTexto} />
        ) : (
          <Text style={styles.botonTexto}>Guardar bicicleta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.fondo,
      padding: 16,
      paddingTop: 50,
    },
    titulo: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 24,
      color: colors.texto,
    },
    label: { fontSize: 14, color: colors.textoSecundario, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.borde,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      color: colors.texto,
      backgroundColor: colors.superficie,
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: colors.borde,
      borderRadius: 8,
      marginBottom: 24,
      backgroundColor: colors.superficie,
    },
    boton: {
      backgroundColor: colors.primario,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    botonDeshabilitado: { opacity: 0.6 },
    botonTexto: { color: colors.primarioTexto, fontWeight: "bold" },
  });