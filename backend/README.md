# Backend — API REST (Node.js + Express + PostGIS)

Implementación real de la API, respetando el contrato definido en
[`/mock-backend/README.md`](../mock-backend/README.md).

## Estructura

```
backend/
├── src/
│   ├── controllers/   # lógica de cada endpoint (bikesController.js, routesController.js, ...)
│   ├── models/        # modelos/queries de PostgreSQL + PostGIS
│   ├── routes/         # definición de rutas Express (bikes.routes.js, routes.routes.js, ...)
│   ├── middleware/    # auth (JWT), validación, manejo de errores
│   └── config/        # conexión a DB, variables de entorno, Firebase Admin SDK
├── index.js           # entry point
└── package.json
```

## Módulos a implementar (en base al paper)

1. **Auth** — registro/login real con JWT (hoy en el mock es un token fake).
2. **Bicicletas** — CRUD contra PostgreSQL.
3. **Recorridos** — persistencia geoespacial con PostGIS (`geometry(LineString, 4326)`).
4. **Motor de mantenimiento ponderado** — el índice de desgaste real (terreno,
   desnivel, clima, estilo de conducción), disparado al finalizar el recorrido.
5. **node-cron** — job de respaldo/conciliación a medianoche.
6. **Firebase Cloud Messaging** — notificaciones push reales.

## Setup (a completar cuando arranque el desarrollo)

```bash
cd backend
npm install
cp .env.example .env   # completar credenciales de DB
npm run dev
```
