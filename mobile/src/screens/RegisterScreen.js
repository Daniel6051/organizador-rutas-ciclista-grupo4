// src/screens/RegisterScreen.js
import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Image,
} from "react-native";
import { registerUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;

function calcularFuerza(password) {
  if (!password) return { nivel: 0, texto: "", color: "#ddd" };
  let puntos = 0;
  if (password.length >= 8) puntos++;
  if (/[A-Z]/.test(password)) puntos++;
  if (/[0-9]/.test(password)) puntos++;
  if (/[!@#$%^&*]/.test(password)) puntos++;
  if (password.length >= 12) puntos++;

  if (puntos <= 1) return { nivel: 1, texto: "Muy débil", color: "#e74c3c" };
  if (puntos === 2) return { nivel: 2, texto: "Débil", color: "#e67e22" };
  if (puntos === 3) return { nivel: 3, texto: "Regular", color: "#f1c40f" };
  if (puntos === 4) return { nivel: 4, texto: "Fuerte", color: "#2ecc71" };
  return { nivel: 5, texto: "Muy fuerte", color: "#27ae60" };
}

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const fuerza = calcularFuerza(password);

  function validar() {
    const nuevosErrores = {};
    if (!nombre.trim()) nuevosErrores.nombre = "Ingresá tu nombre.";
    if (!email) nuevosErrores.email = "Ingresá tu email.";
    else if (!EMAIL_REGEX.test(email)) nuevosErrores.email = "Email inválido.";
    if (!password) nuevosErrores.password = "Ingresá una contraseña.";
    else if (password.length < 8) nuevosErrores.password = "Mínimo 8 caracteres.";
    else if (!/[A-Z]/.test(password)) nuevosErrores.password = "Debe tener al menos una mayúscula.";
    else if (!/[0-9]/.test(password)) nuevosErrores.password = "Debe tener al menos un número.";
    else if (!/[!@#$%^&*]/.test(password)) nuevosErrores.password = "Debe tener al menos un símbolo (!@#$%^&*).";
    if (!confirmar) nuevosErrores.confirmar = "Confirmá tu contraseña.";
    else if (password !== confirmar) nuevosErrores.confirmar = "Las contraseñas no coinciden.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleRegister() {
    if (!validar()) return;
    setLoading(true);
    try {
      const data = await registerUser({ email, nombre, password });
      await signIn(data);
    } catch (err) {
      Alert.alert("No se pudo registrar", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image
        source={require("../../assets/splash-icon.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Empezá a registrar tus rutas</Text>

      <TextInput
        style={[styles.input, errores.nombre && styles.inputError]}
        placeholder="Nombre completo"
        placeholderTextColor={colors.textoTenue}
        value={nombre}
        onChangeText={(v) => { setNombre(v); if (errores.nombre) setErrores((e) => ({ ...e, nombre: null })); }}
      />
      {errores.nombre && <Text style={styles.errorTexto}>{errores.nombre}</Text>}

      <TextInput
        style={[styles.input, errores.email && styles.inputError]}
        placeholder="Email"
        placeholderTextColor={colors.textoTenue}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(v) => { setEmail(v); if (errores.email) setErrores((e) => ({ ...e, email: null })); }}
      />
      {errores.email && <Text style={styles.errorTexto}>{errores.email}</Text>}

      {/* Password con ojito */}
      <View style={[styles.passwordWrapper, errores.password && styles.inputError]}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Contraseña"
          placeholderTextColor={colors.textoTenue}
          secureTextEntry={!verPassword}
          value={password}
          onChangeText={(v) => { setPassword(v); if (errores.password) setErrores((e) => ({ ...e, password: null })); }}
        />
        <TouchableOpacity style={styles.ojito} onPress={() => setVerPassword(!verPassword)}>
          <Text style={styles.ojitoTexto}>{verPassword ? "🙈" : "🙉"}</Text>
        </TouchableOpacity>
      </View>
      {errores.password && <Text style={styles.errorTexto}>{errores.password}</Text>}

      {/* Barra de fuerza de contraseña */}
      {password.length > 0 && (
        <View style={styles.fuerzaContainer}>
          <View style={styles.fuerzaBarra}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.fuerzaSegmento,
                  { backgroundColor: i <= fuerza.nivel ? fuerza.color : colors.bordeSuave },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.fuerzaTexto, { color: fuerza.color }]}>{fuerza.texto}</Text>
        </View>
      )}

      <Text style={styles.requisitos}>
        ✓ Mínimo 8 caracteres · ✓ Una mayúscula · ✓ Un número · ✓ Un símbolo
      </Text>

      {/* Confirmar password */}
      <View style={[styles.passwordWrapper, errores.confirmar && styles.inputError]}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Confirmar contraseña"
          placeholderTextColor={colors.textoTenue}
          secureTextEntry={!verConfirmar}
          value={confirmar}
          onChangeText={(v) => { setConfirmar(v); if (errores.confirmar) setErrores((e) => ({ ...e, confirmar: null })); }}
        />
        <TouchableOpacity style={styles.ojito} onPress={() => setVerConfirmar(!verConfirmar)}>
          <Text style={styles.ojitoTexto}>{verConfirmar ? "🙈" : "🙉"}</Text>
        </TouchableOpacity>
      </View>
      {errores.confirmar && <Text style={styles.errorTexto}>{errores.confirmar}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.botonDeshabilitado]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.primarioTexto} /> : <Text style={styles.buttonText}>Registrarme</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta, ingresar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 28,
      backgroundColor: colors.fondo,
    },
    logo: {
      width: 100,
      height: 100,
      resizeMode: "contain",
      alignSelf: "center",
      marginBottom: 12,
    },
    title: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: colors.primario,
      textAlign: "center",
    },
    subtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.textoSecundario,
      textAlign: "center",
      marginBottom: 28,
    },
    input: {
      fontFamily: "Poppins_400Regular",
      borderWidth: 1.5,
      borderColor: colors.borde,
      borderRadius: 12,
      padding: 14,
      marginBottom: 4,
      backgroundColor: colors.superficie,
      fontSize: 15,
      color: colors.texto,
    },
    inputError: { borderColor: colors.peligro },
    passwordWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.borde,
      borderRadius: 12,
      backgroundColor: colors.superficie,
      marginBottom: 4,
    },
    inputPassword: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      padding: 14,
      fontSize: 15,
      color: colors.texto,
    },
    ojito: { paddingHorizontal: 14 },
    ojitoTexto: { fontSize: 18 },
    errorTexto: {
      fontFamily: "Poppins_400Regular",
      color: colors.peligro,
      fontSize: 12,
      marginBottom: 8,
      marginLeft: 4,
    },
    fuerzaContainer: {
      marginBottom: 6,
      marginTop: 2,
    },
    fuerzaBarra: {
      flexDirection: "row",
      gap: 4,
      marginBottom: 4,
    },
    fuerzaSegmento: {
      flex: 1,
      height: 5,
      borderRadius: 3,
    },
    fuerzaTexto: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      textAlign: "right",
    },
    requisitos: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.textoTenue,
      marginBottom: 12,
      textAlign: "center",
    },
    button: {
      backgroundColor: colors.primario,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
      elevation: 3,
      shadowColor: colors.primario,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    botonDeshabilitado: { opacity: 0.6 },
    buttonText: {
      fontFamily: "Poppins_700Bold",
      color: colors.primarioTexto,
      fontSize: 16,
    },
    link: {
      fontFamily: "Poppins_400Regular",
      color: colors.primario,
      textAlign: "center",
      marginTop: 20,
      fontSize: 14,
    },
  });
}