// src/context/AuthContext.js
// Guarda el usuario y token logueado en memoria durante la sesión de la app,
// y lo persiste en el dispositivo con AsyncStorage para no tener que
// loguearse cada vez que se abre la app.
//
// Requiere: npx expo install @react-native-async-storage/async-storage

import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setOnAuthExpired } from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "@ciclomendoza:auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al abrir la app, restaurar la sesión guardada (si existe)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setUser(saved.user);
          setToken(saved.token);
          setRefreshToken(saved.refreshToken || null);
        }
      } catch (e) {
        console.warn("No se pudo restaurar la sesión:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Si api.js detecta que el refresh token también venció, fuerza el logout
  // para que la app vuelva a la pantalla de Login.
  useEffect(() => {
    setOnAuthExpired(() => {
      signOut();
    });
  }, []);

  async function signIn({ user, token, refreshToken }) {
    setUser(user);
    setToken(token);
    setRefreshToken(refreshToken || null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, refreshToken }));
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  // Actualiza solo los datos del usuario (ej: nombre) sin tocar los tokens.
  // Lee la sesión guardada porque api.js renueva los tokens directo en
  // AsyncStorage, y pisarlos con los del estado dejaría la sesión inválida.
  async function updateUser(cambios) {
    setUser((prev) => ({ ...prev, ...cambios }));
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...saved, user: { ...saved.user, ...cambios } })
        );
      }
    } catch (e) {
      console.warn("No se pudo actualizar el usuario guardado:", e);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
