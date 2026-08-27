-- Script de inicialización de Base de Datos para Organizador de Rutas y Mantenimiento Ciclista
-- Base de datos: ciclorutas_db

-- 1. Habilitar extensión PostGIS (si no está activa)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Creación de la tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar búsquedas por email (insensible a mayúsculas/minúsculas)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- 3. Creación de la tabla de bicicletas
CREATE TABLE IF NOT EXISTS bikes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL DEFAULT 'urbana',
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    componentes JSONB NOT NULL DEFAULT '[
        {"id": "comp_1", "tipo": "cadena", "desgaste": 0.0},
        {"id": "comp_2", "tipo": "frenos", "desgaste": 0.0},
        {"id": "comp_3", "tipo": "neumaticos", "desgaste": 0.0}
    ]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar consultas de bicicletas por usuario
CREATE INDEX IF NOT EXISTS idx_bikes_user_id ON bikes(user_id);

-- 4. Creación de la tabla de recorridos (routes)
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bike_id INTEGER REFERENCES bikes(id) ON DELETE SET NULL,
    inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fin TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    finalizado BOOLEAN NOT NULL DEFAULT FALSE,
    distancia_km NUMERIC(10, 2) DEFAULT 0.0,
    desnivel_m NUMERIC(10, 2) DEFAULT 0.0,
    terreno VARCHAR(100) DEFAULT 'mixto',
    geom geometry(LineString, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices espaciales y de usuario para routes
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_bike_id ON routes(bike_id);
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST(geom);

-- 5. Creación de la tabla para puntos GPS (route_points)
CREATE TABLE IF NOT EXISTS route_points (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION DEFAULT 0.0,
    geom geometry(Point, 4326),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda de puntos GPS
CREATE INDEX IF NOT EXISTS idx_route_points_route_id ON route_points(route_id);
CREATE INDEX IF NOT EXISTS idx_route_points_geom ON route_points USING GIST(geom);

-- Agregado por Tormo, pendiente de validar con Contreras
ALTER TABLE routes ADD COLUMN clima VARCHAR(50);
ALTER TABLE routes ADD COLUMN estilo_conduccion VARCHAR(50);

-- Tarea 3: Firebase Cloud Messaging
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255);

