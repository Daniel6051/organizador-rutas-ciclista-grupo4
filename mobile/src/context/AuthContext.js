// src/context/AuthContext.js
// Guarda el usuario y token logueado en memoria durante la sesión de la app,
// y lo persiste en el dispositivo con AsyncStorage para no tener que
// loguearse cada vez que se abre la app.
//
// Requiere: npx expo install @react-native-async-storage/async-storage

import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);

const STORAGE_KEY = "@ciclomendoza:auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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
        }
      } catch (e) {
        console.warn("No se pudo restaurar la sesión:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn({ user, token }) {
    setUser(user);
    setToken(token);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
