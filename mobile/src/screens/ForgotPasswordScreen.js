// mobile/src/screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Ajustá esta constante a la IP/host de tu backend (la misma que usás en api.js)
const API_URL = 'http://192.168.1.5:3000/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold });

  const [paso, setPaso] = useState(1); // 1 = pedir código, 2 = confirmar código + nueva contraseña
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!fontsLoaded) return null;

  const solicitarCodigo = async () => {
    if (!email) {
      Alert.alert('Error', 'Ingresá tu email');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar el código');

      Alert.alert('Revisá tu email', data.mensaje);
      setPaso(2);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmarNuevaContrasena = async () => {
    if (!codigo || !nuevaContrasena || !confirmarContrasena) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, nuevaContrasena }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña');

      Alert.alert('¡Listo!', 'Tu contraseña fue actualizada. Ya podés iniciar sesión.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Recuperar contraseña</Text>

      {paso === 1 ? (
        <>
          <Text style={styles.subtitulo}>
            Ingresá tu email y te enviamos un código de verificación.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={styles.boton}
            onPress={solicitarCodigo}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Enviar código</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitulo}>
            Ingresá el código de 6 dígitos que te enviamos y tu nueva contraseña.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            value={nuevaContrasena}
            onChangeText={setNuevaContrasena}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar nueva contraseña"
            value={confirmarContrasena}
            onChangeText={setConfirmarContrasena}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.boton}
            onPress={confirmarNuevaContrasena}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={solicitarCodigo} disabled={cargando}>
            <Text style={styles.link}>¿No recibiste el código? Reenviar</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Volver al login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#2e7d32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'Poppins_400Regular',
  },
  boton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  botonTexto: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  link: {
    color: '#2e7d32',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
  },
});