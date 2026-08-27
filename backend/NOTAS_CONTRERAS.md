# Notas sobre el esquema (Tormo)

Contreras, como no estabas, agregué los campos `clima` y `estilo_conduccion` para poder implementar el motor de mantenimiento ponderado que vimos en la última reunión. Los cambios ya están en el `database.sql` y aplicados en local. 

Acá te dejo el detalle para cuando vuelvas a armar el modelo / controladores de tu lado:

## Nuevos campos en `routes`
Ambos son `VARCHAR(50)` y opcionales por ahora (admiten `NULL`), para no romper la app de mobile si mandan versiones viejas sin estos campos.

- **clima**: 
  - Valores esperados: `"soleado"`, `"nublado"`, `"lluvia"`, `"nieve"`
  - Se espera en el body de `POST /routes/:id/finish`

- **estilo_conduccion**:
  - Valores esperados: `"suave"`, `"moderado"`, `"agresivo"`
  - Se espera en el body de `POST /routes/:id/finish`

Si te parece que el tipo de dato tiene que ser un ENUM, lo cambiamos en una migración futura, pero por ahora en `VARCHAR` nos sirve para avanzar y probar el cálculo de desgaste con la app mobile.
