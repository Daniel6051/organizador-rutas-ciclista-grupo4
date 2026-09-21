// src/screens/ProfileScreen.js
// Perfil de usuario: permite cambiar el nombre y la contraseña.
// (La foto de perfil queda para una segunda versión.)

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { updateProfile, changePassword } from "../services/api";

// Misma regla que valida el backend: 8+ caracteres, mayúscula, número y símbolo
const PASSWORD_FUERTE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user, updateUser } = useAuth();

  const [nombre, setNombre] = useState(user?.nombre || "");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordRepetida, setPasswordRepetida] = useState("");
  const [verPasswords, setVerPasswords] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const nombreLimpio = nombre.trim();
  const nombreCambio = nombreLimpio.length > 0 && nombreLimpio !== user?.nombre;
  const inicial = (user?.nombre || user?.email || "?").trim().charAt(0).toUpperCase();

  async function handleGuardarNombre() {
    setGuardandoNombre(true);
    try {
      const { user: actualizado } = await updateProfile({ nombre: nombreLimpio });
      await updateUser({ nombre: actualizado.nombre });
      Alert.alert("Listo", "Actualizamos tu nombre.");
    } catch (err) {
      Alert.alert("No se pudo actualizar el nombre", err.message);
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function handleCambiarPassword() {
    if (!passwordActual || !passwordNueva || !passwordRepetida) {
      Alert.alert("Faltan datos", "Completá los tres campos de contraseña.");
      return;
    }
    if (!PASSWORD_FUERTE.test(passwordNueva)) {
      Alert.alert(
        "Contraseña débil",
        "Usá al menos 8 caracteres, una mayúscula, un número y un símbolo."
      );
      return;
    }
    if (passwordNueva !== passwordRepetida) {
      Alert.alert("No coinciden", "La nueva contraseña y su repetición son distintas.");
      return;
    }

    setGuardandoPassword(true);
    try {
      await changePassword({ passwordActual, passwordNueva });
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordRepetida("");
      Alert.alert("Listo", "Cambiamos tu contraseña.");
    } catch (err) {
      Alert.alert("No se pudo cambiar la contraseña", err.message);
    } finally {
      setGuardandoPassword(false);
    }
  }

  // Campo de contraseña con ojito compartido (función, no componente,
  // para que el input no pierda el foco al re-renderizar)
  function campoPassword(label, valor, setValor) {
    return (
      <>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputFila}>
          <TextInput
            style={styles.inputPassword}
            value={valor}
            onChangeText={setValor}
            secureTextEntry={!verPasswords}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textoTenue}
          />
          <TouchableOpacity onPress={() => setVerPasswords((v) => !v)} hitSlop={8}>
            <Feather
              name={verPasswords ? "eye-off" : "eye"}
              size={20}
              color={colors.textoSecundario}
            />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{inicial}</Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>

        {/* Nombre */}
        <View style={styles.card}>
          <Text style={styles.seccion}>Datos personales</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textoTenue}
            maxLength={60}
          />

          <TouchableOpacity
            style={[styles.boton, (!nombreCambio || guardandoNombre) && styles.botonDeshabilitado]}
            onPress={handleGuardarNombre}
            disabled={!nombreCambio || guardandoNombre}
          >
            {guardandoNombre ? (
              <ActivityIndicator color={colors.primarioTexto} />
            ) : (
              <Text style={styles.botonTexto}>Guardar nombre</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Contraseña */}
        <View style={styles.card}>
          <Text style={styles.seccion}>Cambiar contraseña</Text>

          {campoPassword("Contraseña actual", passwordActual, setPasswordActual)}
          {campoPassword("Contraseña nueva", passwordNueva, setPasswordNueva)}
          {campoPassword("Repetir contraseña nueva", passwordRepetida, setPasswordRepetida)}

          <Text style={styles.ayuda}>
            Mínimo 8 caracteres, con una mayúscula, un número y un símbolo.
          </Text>

          <TouchableOpacity
            style={[styles.boton, guardandoPassword && styles.botonDeshabilitado]}
            onPress={handleCambiarPassword}
            disabled={guardandoPassword}
          >
            {guardandoPassword ? (
              <ActivityIndicator color={colors.primarioTexto} />
            ) : (
              <Text style={styles.botonTexto}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.fondo },
    contenido: { padding: 16, paddingBottom: 40 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.primario,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginTop: 8,
    },
    avatarTexto: {
      fontFamily: "Poppins_700Bold",
      fontSize: 34,
      color: colors.primarioTexto,
    },
    email: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.textoSecundario,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 20,
    },
    card: {
      backgroundColor: colors.superficie,
      borderWidth: 1,
      borderColor: colors.bordeSuave,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    seccion: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.texto,
      marginBottom: 14,
    },
    label: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.textoSecundario,
      marginBottom: 6,
    },
    input: {
      fontFamily: "Poppins_400Regular",
      borderWidth: 1,
      borderColor: colors.borde,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: colors.texto,
      backgroundColor: colors.fondo,
    },
    inputFila: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borde,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
      backgroundColor: colors.fondo,
    },
    inputPassword: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      paddingVertical: 12,
      color: colors.texto,
    },
    ayuda: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.textoTenue,
      marginBottom: 16,
    },
    boton: {
      backgroundColor: colors.primario,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    botonDeshabilitado: { opacity: 0.5 },
    botonTexto: {
      fontFamily: "Poppins_600SemiBold",
      color: colors.primarioTexto,
    },
  });
