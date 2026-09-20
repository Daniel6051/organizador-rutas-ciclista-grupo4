# 🚴 Organizador de Rutas y Mantenimiento Ciclista

Prototipo de aplicación móvil multiplataforma orientada a ciclistas urbanos y recreativos de la Provincia de Mendoza, Argentina.

Desarrollado en el marco de la cátedra Práctica Integradora de la Licenciatura en Informática y Desarrollo de Software — Universidad del Aconcagua.

> Trabajo presentado en el XXXII Congreso Argentino de Ciencias de la Computación (CACIC 2026) — UTN FRCU.

## 🎥 Demo en video

[![Demo de la app](https://img.youtube.com/vi/pfjfw8sVc2Y/0.jpg)](https://www.youtube.com/watch?v=pfjfw8sVc2Y)

## 📋 Descripción

La aplicación integra en un único entorno funcional:

- 📍 **Navegación GPS en tiempo real** sobre la red de ciclovías mendocina, con planificación de mejor ruta ciclista entre dos puntos (OpenRouteService, perfil cycling-regular)
- 🚧 **Reporte y alertas de incidentes en tiempo real**: baches, cortes de calle, obras, zonas inseguras y semáforos rotos reportados por la comunidad, visibles en el mapa y con expiración automática a las 24hs
- 🔔 **Alertas de tráfico predictivas**: notificación push automática cuando aparece un incidente cercano a una ruta que el usuario tiene planificada
- 📓 **Bitácora digital de recorridos** con estadísticas de rendimiento (distancia, desnivel, duración) y soporte completo para modo offline con sincronización automática al recuperar conexión
- 🔧 **Motor de mantenimiento preventivo** con alertas automáticas ponderadas por distancia, desnivel, clima y estilo de conducción
- 👤 **Perfiles de bicicleta** con soporte para múltiples bicicletas por usuario
- 📊 **Módulo de estadísticas** semanales y mensuales

## 👥 Integrantes — Grupo 4

| Legajo | Nombre | Contacto |
|---|---|---|
| 114422 | Daniel Celedón | celedondaniel21@gmail.com |
| 114635 | Facundo Contreras | facundomartincontreras06@gmail.com |
| 114766 | Facundo Ortiz | fortiz@uda.edu.ar |
| 114560 | Joaquín Tormo | joaquintormo13@gmail.com |

**Director:** Prof. Dr. Miguel Méndez-Garabetti — mmendez@uda.edu.ar

## 🛠️ Stack Tecnológico

### Frontend — App Móvil
- React Native con Expo (SDK 54)
- `expo-location` para captura GPS
- `react-native-maps` + Google Maps SDK
- `expo-sqlite` para persistencia offline
- `expo-notifications` para notificaciones push

### Backend — API REST
- Node.js + Express.js (patrón MVC)
- PostgreSQL + PostGIS para datos geoespaciales (rutas, incidentes, rutas activas)
- JWT con refresh token rotativo para autenticación
- `node-cron` para el motor de alertas de mantenimiento
- Firebase Cloud Messaging para notificaciones push (alertas de mantenimiento y de incidentes cercanos)
- OpenRouteService (Directions API, perfil cycling-regular) para el cálculo de rutas ciclistas

### Infraestructura
- Docker + Docker Compose
- GitHub (branching: `main` / `develop` / `feature-*`)

## 📁 Estructura del Repositorio

organizador-rutas-ciclista-grupo4/
│
├── README.md
│
├── paper/ # Paper académico CACIC 2026
│ ├── main.tex # Fuente LaTeX
│ ├── referencias.bib # Referencias en BibTeX
│ └── CACIC2026_Grupo4.pdf # PDF compilado
│
├── docs/ # Documentación del proyecto
│ └── Investigacion_Aplicada_v2.pdf
│
├── backend/ # API REST (Node.js + Express)
│
└── mobile/ # App móvil (React Native + Expo)


## 📄 Paper

El paper completo está disponible en la carpeta `/paper`.

**Título:** Organizador de Rutas y Mantenimiento Ciclista: Prototipo de Aplicación Móvil Multiplataforma para Mendoza, Argentina

Presentado en CACIC 2026 — https://frcu.utn.edu.ar/index.php/cacic-2026

## 📚 Obra de Referencia

Saavedra Basto, A. (2022). *Prototipo de aplicación móvil y web para la visualización, administración y seguimiento de rutas ciclísticas.* UNAB. https://repository.unab.edu.co/handle/20.500.12749/18446

## 🚧 Estado del Proyecto

| Módulo | Estado |
|---|---|
| Configuración del entorno (Docker, Expo, PostgreSQL) | ✅ Completado |
| Autenticación + Perfiles de bicicleta | ✅ Completado |
| Captura GPS + Bitácora (con modo offline y sincronización) | ✅ Completado |
| Motor de mantenimiento ponderado (distancia + desnivel + multiplicadores) | ✅ Completado |
| Backup nocturno con node-cron | ✅ Completado |
| Notificaciones push Firebase Cloud Messaging | ✅ Completado |
| Planificación de mejor ruta ciclista (OpenRouteService) | ✅ Completado |
| Reporte de incidentes en tiempo real (baches, cortes, obras, etc.) | ✅ Completado |
| Alertas de tráfico predictivas (incidente cercano a ruta planificada) | ✅ Completado |
| Estadísticas + Interfaz | ✅ Completado |
| Pruebas de integración + Documentación final | 📅 Planificado |
