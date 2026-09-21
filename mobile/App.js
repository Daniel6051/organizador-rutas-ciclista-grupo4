// App.js
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, LogBox, Image } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BikesScreen from "./src/screens/BikesScreen";
import AddBikeScreen from "./src/screens/AddBikeScreen";
import EditBikeScreen from "./src/screens/EditBikeScreen";
import StatsScreen from "./src/screens/StatsScreen";
import HistorialScreen from "./src/screens/HistorialScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabsPrincipales() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 70,
          paddingTop: 10,
          paddingBottom: 16,
          backgroundColor: colors.superficie,
          borderTopColor: colors.bordeSuave,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Feather name="home" size={26} color={focused ? colors.primario : colors.tabInactivo} />
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
              <MaterialCommunityIcons name="bike" size={28} color={focused ? colors.primario : colors.tabInactivo} />
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
              <Feather name="bar-chart-2" size={26} color={focused ? colors.primario : colors.tabInactivo} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Historial"
        component={HistorialScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Feather name="clock" size={26} color={focused ? colors.primario : colors.tabInactivo} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();
  const { colors, tema } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.fondo }}>
        <ActivityIndicator size="large" color={colors.primario} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={tema === "oscuro" ? "light" : "dark"} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Tabs" component={TabsPrincipales} />
              <Stack.Screen
                name="AddBike"
                component={AddBikeScreen}
                options={{
                  headerShown: true,
                  title: "Nueva bicicleta",
                  headerStyle: { backgroundColor: colors.superficie },
                  headerTintColor: colors.texto,
                }}
              />
              <Stack.Screen
                name="EditBike"
                component={EditBikeScreen}
                options={{
                  headerShown: true,
                  title: "Editar bicicleta",
                  headerStyle: { backgroundColor: colors.superficie },
                  headerTintColor: colors.texto,
                }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                  headerShown: true,
                  title: "Mi perfil",
                  headerStyle: { backgroundColor: colors.superficie },
                  headerTintColor: colors.texto,
                }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      // Mostrar splash custom por 2.5 segundos
      setTimeout(() => setSplashVisible(false), 2500);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || splashVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <Image
          source={require("./assets/splash-icon.png")}
          style={{ width: 280, height: 280, resizeMode: "contain" }}
        />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </ThemeProvider>
  );
}
