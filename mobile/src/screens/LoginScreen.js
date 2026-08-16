// src/screens/LoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  function validar() {
    const nuevosErrores = {};
    if (!email) {
      nuevosErrores.email = "Ingresá tu email.";
    } else if (!EMAIL_REGEX.test(email)) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    if (!password) {
      nuevosErrores.password = "Ingresá tu contraseña.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleLogin() {
    if (!validar()) return;

    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      await signIn(data); // data = { user, token }
      // La navegación a Home ocurre sola: App.js decide la pantalla según el auth state
    } catch (err) {
      Alert.alert("No se pudo iniciar sesión", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Organizador de Rutas</Text>
      <Text style={styles.subtitle}>Ciclismo en Mendoza</Text>

      <TextInput
        style={[styles.input, errores.email && styles.inputError]}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errores.email) setErrores((e) => ({ ...e, email: null }));
        }}
      />
      {errores.email && <Text style={styles.errorTexto}>{errores.email}</Text>}

      <TextInput
        style={[styles.input, errores.password && styles.inputError]}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errores.password) setErrores((e) => ({ ...e, password: null }));
        }}
      />
      {errores.password && <Text style={styles.errorTexto}>{errores.password}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>¿No tenés cuenta? Registrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  inputError: { borderColor: "#c0392b" },
  errorTexto: { color: "#c0392b", fontSize: 12, marginBottom: 10 },
  button: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  link: { color: "#2e7d32", textAlign: "center", marginTop: 16 },
});
