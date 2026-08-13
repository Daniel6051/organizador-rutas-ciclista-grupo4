# Mock Backend — Organizador de Rutas y Mantenimiento Ciclista

Servidor mock en Express que implementa el **contrato de API** acordado entre
el subgrupo Mobile (React Native/Expo) y el subgrupo Backend (Node/Express +
PostGIS). El objetivo es que Mobile pueda arrancar a desarrollar la app YA,
sin esperar a que el backend real esté listo.

Cuando el backend real (PostGIS, JWT real, motor de reglas real) esté
implementado, la app mobile solo tiene que cambiar la `BASE_URL` — el
contrato de endpoints y formatos de respuesta se mantiene igual.

## Cómo correrlo

```bash
cd mock-backend
npm install
npm start
```

Queda escuchando en `http://localhost:3000`.

> Nota: si probás desde el emulador/celular con Expo, usá la IP de tu red
> local en vez de `localhost` (ej: `http://192.168.0.x:3000`).

## Contrato de endpoints

### Auth
| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{email, nombre, password}` | `{user, token}` |
| POST | `/auth/login` | `{email, password}` | `{user, token}` |

### Bicicletas
| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| GET | `/bikes` | — | `Bike[]` |
| POST | `/bikes` | `{nombre, tipo}` | `Bike` |
| GET | `/bikes/:id` | — | `Bike` |
| PUT | `/bikes/:id` | campos a actualizar | `Bike` |
| DELETE | `/bikes/:id` | — | `204` |

`Bike = { id, userId, nombre, tipo, fechaAlta, componentes: [{id, tipo, desgaste}] }`

### Recorridos / Bitácora
| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/routes/start` | `{bikeId}` | `Route` (recorrido iniciado) |
| POST | `/routes/:id/points` | `{puntos: [{lat,lng,timestamp,altitud}]}` | `{ok, totalPuntos}` |
| POST | `/routes/:id/finish` | `{distanciaKm, desnivelM, terreno}` | `{route, evaluacionMantenimiento}` |
| GET | `/routes` | — | `Route[]` |
| GET | `/routes/:id` | — | `Route` |

`finish` es el endpoint clave del paper: simula el disparo inmediato del
motor de mantenimiento ponderado al terminar el recorrido.

### Estadísticas
| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/stats/summary` | `{totalRecorridos, distanciaTotalKm, desnivelTotalM}` |

### Mantenimiento
| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/bikes/:id/maintenance` | `{bikeId, componentes, proximaRevision}` |

### Notificaciones
| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/users/device-token` | `{userId, token}` | `{ok, userId, tokenGuardado}` |

## Datos

Todo vive en memoria (arrays de JS) — se reinicia cada vez que se reinicia
el server. No hay persistencia real ni PostGIS: eso lo construye el
subgrupo Backend por separado, respetando este mismo contrato.

## Próximo paso para el subgrupo Backend

Reimplementar cada endpoint contra PostgreSQL/PostGIS y JWT real,
manteniendo el mismo path, verbo HTTP y forma de la respuesta. Así el
switch de Mobile de mock → real es solo cambiar la URL base.
