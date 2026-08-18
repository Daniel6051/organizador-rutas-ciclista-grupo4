// App.js
// Punto de entrada. Define la navegación: si no hay sesión, muestra
// Login/Register; si hay sesión, muestra una barra de pestañas abajo
// con Inicio, Bicis y Estadísticas, más las pantallas de agregar/editar
// bici encima.
//
// Requiere:
//   npx expo install @react-navigation/native @react-navigation/native-stack
//   npx expo install @react-navigation/bottom-tabs
//   npx expo install react-native-screens react-native-safe-area-context

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, LogBox } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BikesScreen from "./src/screens/BikesScreen";
import AddBikeScreen from "./src/screens/AddBikeScreen";
import EditBikeScreen from "./src/screens/EditBikeScreen";
import StatsScreen from "./src/screens/StatsScreen";

// Expo Go tira este aviso apenas se importa expo-notifications (no funciona
// el push real en Expo Go desde SDK 53+). No es un error de nuestro código,
// así que lo silenciamos para que no tape la pantalla en cada apertura.
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Barra de pestañas de abajo, visible una vez que el usuario está logueado
function TabsPrincipales() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // oculta el texto, deja solo el ícono
        tabBarStyle: {
          height: 70,
          paddingTop: 10,
          paddingBottom: 16, // margen respecto al borde inferior
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Feather name="home" size={26} color={focused ? "#2e7d32" : "#aaa"} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Bicis"
        component={BikesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="bike" size={28} color={focused ? "#2e7d32" : "#aaa"} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Estadisticas"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Feather name="bar-chart-2" size={26} color={focused ? "#2e7d32" : "#aaa"} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={TabsPrincipales} />
            <Stack.Screen
              name="AddBike"
              component={AddBikeScreen}
              options={{ headerShown: true, title: "Nueva bicicleta" }}
            />
            <Stack.Screen
              name="EditBike"
              component={EditBikeScreen}
              options={{ headerShown: true, title: "Editar bicicleta" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}