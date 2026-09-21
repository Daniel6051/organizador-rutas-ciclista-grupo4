// src/context/ThemeContext.js
// Maneja el tema claro/oscuro de toda la app. Sigue el mismo patrón que
// AuthContext: estado en memoria + persistencia con AsyncStorage para
// recordar la preferencia entre sesiones. Si el usuario nunca eligió,
// arranca con el tema del sistema operativo.
//
// Requiere: npx expo install @react-native-async-storage/async-storage
// (ya está instalado, lo usa AuthContext)

import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext(null);

const STORAGE_KEY = "@ciclomendoza:theme";

const coloresClaro = {
  fondo: "#f8faf8",
  superficie: "#ffffff",
  texto: "#222222",
  textoSecundario: "#666666",
  textoTenue: "#999999",
  borde: "#dddddd",
  bordeSuave: "#eeeeee",
  primario: "#2e7d32",
  primarioTexto: "#ffffff",
  peligro: "#c0392b",
  advertencia: "#e67e22",
  tabInactivo: "#aaaaaa",
};

const coloresOscuro = {
  fondo: "#121212",
  superficie: "#1e1e1e",
  texto: "#f0f0f0",
  textoSecundario: "#b5b5b5",
  textoTenue: "#888888",
  borde: "#3a3a3a",
  bordeSuave: "#2a2a2a",
  primario: "#4caf50",
  primarioTexto: "#ffffff",
  peligro: "#e57373",
  advertencia: "#f0a94e",
  tabInactivo: "#6b6b6b",
};

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState("claro"); // "claro" | "oscuro"

  useEffect(() => {
    (async () => {
      try {
        const guardado = await AsyncStorage.getItem(STORAGE_KEY);
        if (guardado === "claro" || guardado === "oscuro") {
          setTema(guardado);
        } else {
          const sistema = Appearance.getColorScheme();
          setTema(sistema === "dark" ? "oscuro" : "claro");
        }
      } catch (e) {
        console.warn("No se pudo restaurar el tema:", e);
      }
    })();
  }, []);

  async function toggleTema() {
    const nuevo = tema === "claro" ? "oscuro" : "claro";
    setTema(nuevo);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nuevo);
    } catch (e) {
      console.warn("No se pudo guardar el tema:", e);
    }
  }

  const colors = tema === "oscuro" ? coloresOscuro : coloresClaro;

  return (
    <ThemeContext.Provider value={{ tema, isDark: tema === "oscuro", colors, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
