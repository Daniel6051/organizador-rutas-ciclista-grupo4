// src/screens/LoginScreen.js
import React, { useState, useRef, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Animated, Easing, Image,
} from "react-native";
import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000; // 5 minutos

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  }

  function validar() {
    const nuevosErrores = {};
    if (!email) nuevosErrores.email = "Ingresá tu email.";
    else if (!EMAIL_REGEX.test(email)) nuevosErrores.email = "Email inválido.";
    if (!password) nuevosErrores.password = "Ingresá tu contraseña.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleLogin() {
    // TEMPORAL - borrar después
    Alert.alert("URL", `Conectando a: ${require('../services/api').BASE_URL}`);
    // Verificar bloqueo
    if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
      const restante = Math.ceil((bloqueadoHasta - Date.now()) / 60000);
      Alert.alert("Cuenta bloqueada", `Demasiados intentos fallidos. Esperá ${restante} minuto(s).`);
      return;
    }

    if (!validar()) { shake(); return; }

    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      setIntentosFallidos(0);
      setBloqueadoHasta(null);
      await signIn(data);
    } catch (err) {
      shake();
      const nuevosIntentos = intentosFallidos + 1;
      setIntentosFallidos(nuevosIntentos);

      if (nuevosIntentos >= MAX_INTENTOS) {
        const hasta = Date.now() + BLOQUEO_MS;
        setBloqueadoHasta(hasta);
        setIntentosFallidos(0);
        Alert.alert(
          "Cuenta bloqueada",
          "Realizaste 5 intentos fallidos. Tu cuenta está bloqueada por 5 minutos."
        );
      } else {
        Alert.alert(
          "No se pudo iniciar sesión",
          `${err.message}\n\nIntentos fallidos: ${nuevosIntentos}/${MAX_INTENTOS}`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const bloqueado = bloqueadoHasta && Date.now() < bloqueadoHasta;

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/splash-icon.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>Organizador de Rutas</Text>
      <Text style={styles.subtitle}>Ciclismo en Mendoza</Text>

      <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
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

        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.inputPassword, errores.password && styles.inputError]}
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

        {intentosFallidos > 0 && !bloqueado && (
          <Text style={styles.advertencia}>
            ⚠️ {intentosFallidos}/{MAX_INTENTOS} intentos fallidos
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, (loading || bloqueado) && styles.botonDeshabilitado]}
          onPress={handleLogin}
          disabled={loading || bloqueado}
        >
          {loading ? <ActivityIndicator color={colors.primarioTexto} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>¿No tenés cuenta? Registrate</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.linkOlvide}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 28,
      backgroundColor: colors.fondo,
    },
    logo: {
      width: 120,
      height: 120,
      resizeMode: "contain",
      alignSelf: "center",
      marginBottom: 16,
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
      marginBottom: 32,
    },
    form: { width: "100%" },
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
      marginBottom: 10,
      marginLeft: 4,
    },
    advertencia: {
      fontFamily: "Poppins_400Regular",
      color: colors.advertencia,
      fontSize: 12,
      marginBottom: 8,
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
    linkOlvide: {
      fontFamily: "Poppins_400Regular",
      color: colors.textoTenue,
      textAlign: "center",
      marginTop: 10,
      fontSize: 13,
      textDecorationLine: "underline",
    },
  });
}