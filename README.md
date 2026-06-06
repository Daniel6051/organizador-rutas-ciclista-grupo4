# 🚴 Organizador de Rutas y Mantenimiento Ciclista

Prototipo de aplicación móvil multiplataforma orientada a ciclistas urbanos y recreativos de la **Provincia de Mendoza, Argentina**.

Desarrollado en el marco de la cátedra **Práctica Integradora** de la Licenciatura en Informática y Desarrollo de Software — Universidad del Aconcagua.

> Trabajo presentado en el **XXXII Congreso Argentino de Ciencias de la Computación (CACIC 2026)** — UTN FRCU.

---

## 📋 Descripción

La aplicación integra en un único entorno funcional:

- 📍 **Navegación GPS en tiempo real** sobre la red de ciclovías mendocina
- 📓 **Bitácora digital de recorridos** con estadísticas de rendimiento (distancia, velocidad, calorías)
- 🔧 **Motor de mantenimiento preventivo** con alertas automáticas por kilómetros acumulados por componente
- 👤 **Perfiles de bicicleta** con soporte para múltiples bicicletas por usuario
- 📊 **Módulo de estadísticas** semanales y mensuales

---

## 👥 Integrantes — Grupo 4

| Legajo | Nombre | Contacto |
|--------|--------|----------|
| 114422 | Daniel Celedón | celedondaniel21@gmail.com |
| 114635 | Facundo Contreras | facundomartincontreras06@gmail.com |
| 114766 | Facundo Ortiz | fortiz@uda.edu.ar |
| 114560 | Joaquín Tormo | joaquintormo13@gmail.com |

**Director:** Prof. Dr. Miguel Méndez-Garabetti — mmendez@uda.edu.ar

---

## 🛠️ Stack Tecnológico

### Frontend — App Móvil
- [React Native](https://reactnative.dev/) con [Expo](https://expo.dev/)
- `expo-location` para captura GPS
- `react-native-maps` + Google Maps SDK

### Backend — API REST
- [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/) + [PostGIS](https://postgis.net/) para datos geoespaciales
- JWT para autenticación
- `node-cron` para el motor de alertas de mantenimiento
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) para notificaciones push

### Infraestructura
- Docker + Docker Compose
- GitHub (branching: `main / develop / feature-*`)

---

## 📁 Estructura del Repositorio

```
organizador-rutas-ciclista-grupo4/
│
├── README.md
│
├── paper/                        # Paper académico CACIC 2026
│   ├── main.tex                  # Fuente LaTeX
│   ├── referencias.bib           # Referencias en BibTeX
│   └── CACIC2026_Grupo4.pdf      # PDF compilado
│
├── docs/                         # Documentación del proyecto
│   └── Investigacion_Aplicada_v2.pdf
│
├── backend/                      # API REST (Node.js + Express) — en desarrollo
│
└── mobile/                       # App móvil (React Native + Expo) — en desarrollo
```

---

## 📄 Paper

El paper completo está disponible en la carpeta [`/paper`](./paper/).

**Título:** *Organizador de Rutas y Mantenimiento Ciclista: Prototipo de Aplicación Móvil Multiplataforma para Mendoza, Argentina*

Presentado en CACIC 2026 — [https://frcu.utn.edu.ar/index.php/cacic-2026](https://frcu.utn.edu.ar/index.php/cacic-2026)

---

## 📚 Obra de Referencia

Saavedra Basto, A. (2022). *Prototipo de aplicación móvil y web para la visualización, administración y seguimiento de rutas ciclísticas.* UNAB. https://repository.unab.edu.co/handle/20.500.12749/18446

---

## 🚧 Estado del Proyecto

| Módulo | Estado |
|--------|--------|
| Configuración del entorno (Docker, Expo, PostgreSQL) | ✅ Completado |
| Autenticación + Perfiles de bicicleta | ✅ Completado |
| Captura GPS + Bitácora | ✅ Completado |
| Motor de mantenimiento preventivo | ✅ Completado |
| Estadísticas + Interfaz | ✅ Completado |
| Navegación turn-by-turn (Google Maps) | 🔄 En progreso |
| Pruebas de integración + Documentación final | 📅 Planificado |
