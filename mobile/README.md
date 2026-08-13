# Mobile — App móvil (React Native + Expo)

App orientada a ciclistas de Mendoza. Durante el desarrollo, apuntar al
`mock-backend` (ver `/mock-backend/README.md`) y luego migrar la
`BASE_URL` al backend real cuando esté listo.

## Estructura

```
mobile/
├── src/
│   ├── screens/       # pantallas (LoginScreen, HomeScreen, RouteTrackingScreen, BikeProfileScreen, ...)
│   ├── components/    # componentes reutilizables (MapView, StatCard, ...)
│   ├── services/      # cliente HTTP hacia la API (api.js con la BASE_URL configurable)
│   └── hooks/         # hooks custom (useLocation, useAuth, ...)
├── App.js
├── app.json            # config de Expo
└── package.json
```

## Módulos a implementar (en base al paper)

1. **Auth** — pantallas de login/registro consumiendo `/auth/*`.
2. **Navegación GPS** — `expo-location` + `react-native-maps`, captura en
   segundo plano.
3. **Bitácora offline-first** — persistir puntos GPS en SQLite y
   sincronizar contra `/routes/:id/points` cuando vuelve la conectividad.
4. **Perfiles de bicicleta** — CRUD contra `/bikes`.
5. **Estadísticas** — consumo de `/stats/summary`.
6. **Notificaciones push** — registro de token FCM contra
   `/users/device-token` y manejo de la notificación recibida.

## Setup (a completar cuando arranque el desarrollo)

```bash
cd mobile
npx create-expo-app . --template blank
npm install expo-location react-native-maps expo-sqlite
npx expo start
```

Configurar la URL del mock server en `src/services/api.js`:

```js
export const BASE_URL = "http://<TU_IP_LOCAL>:3000";
```
