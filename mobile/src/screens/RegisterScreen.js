// src/screens/RegisterScreen.js
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
import { registerUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  function validar() {
    const nuevosErrores = {};
    if (!nombre.trim()) {
      nuevosErrores.nombre = "Ingresá tu nombre.";
    }
    if (!email) {
      nuevosErrores.email = "Ingresá tu email.";
    } else if (!EMAIL_REGEX.test(email)) {
      nuevosErrores.email = "El email no tiene un formato válido.";
    }
    if (!password) {
      nuevosErrores.password = "Ingresá una contraseña.";
    } else if (password.length < 6) {
      nuevosErrores.password = "La contraseña debe tener al menos 6 caracteres.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleRegister() {
    if (!validar()) return;

    setLoading(true);
    try {
      const data = await registerUser({ email, nombre, password });
      await signIn(data); // registro exitoso -> queda logueado directo
    } catch (err) {
      Alert.alert("No se pudo registrar", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput
        style={[styles.input, errores.nombre && styles.inputError]}
        placeholder="Nombre"
        value={nombre}
        onChangeText={(v) => {
          setNombre(v);
          if (errores.nombre) setErrores((e) => ({ ...e, nombre: null }));
        }}
      />
      {errores.nombre && <Text style={styles.errorTexto}>{errores.nombre}</Text>}

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
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Registrarme</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta, ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 32 },
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
