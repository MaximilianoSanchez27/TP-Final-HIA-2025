# Scripts: populate_db.js

Este archivo explica cómo usar el script `populate_db.js` para poblar la base de datos del proyecto con datos falsos, útil para desarrollo y pruebas.

ADVERTENCIA: Este script puede ser destructivo si se ejecuta con `--force` o `POPULATE_FORCE=true` (puede eliminar tablas). Úsalo con cuidado y nunca contra bases de datos productivas.

Requisitos
- Node.js (se recomienda v16 o superior)
- PostgreSQL accesible con la configuración de `.env` del repositorio (el script carga el `.env` en la raíz del proyecto por defecto)
- Desde la raíz del proyecto, asegúrate de instalar dependencias en `backend_FJV`:

PowerShell:

```powershell
cd backend_FJV
npm install
```

Prueba rápida (PowerShell)

Haz una prueba pequeña para verificar que el script encaja con tu esquema antes de realizar cargas grandes. Ejemplo: crear 2 categorías, 5 clubes y 10 personas.

```powershell
# Desde la raíz del repositorio (ejemplo en una sola línea)
$env:POPULATE_TOTAL_CATEGORIAS=2; $env:POPULATE_TOTAL_CLUBS=5; $env:POPULATE_TOTAL_PERSONAS=10; node .\backend_FJV\scripts\populate_db.js
```

Configuración (vía variables de entorno)
- POPULATE_TOTAL_CATEGORIAS (por defecto: 100)
- POPULATE_TOTAL_CLUBS (por defecto: 200000)
- POPULATE_TOTAL_PERSONAS (por defecto: 200000)
- POPULATE_BATCH_SIZE (por defecto: 10000) — número de filas por lote en `bulkCreate`
- POPULATE_FORCE (o pasar `--force`) — si es truthy, el script ejecutará `sync({ force: true })` y eliminará/recreará las tablas

Comportamiento y notas de seguridad
- El script intenta reutilizar los modelos del proyecto en `backend_FJV/src/models/*` cuando existen. Si no encuentra los modelos, usa definiciones de ejemplo locales.
- Para evitar colisiones por constraints únicos, el script:
  - Detecta patrones deterministas de email/dni ya existentes (p. ej. `club123@example.com`, `persona456@example.com`) y ajusta los contadores internos para evitar duplicados.
  - Trunca las cadenas generadas para ajustarlas a la longitud de las columnas del modelo y así evitar errores tipo "value too long".
- Para importaciones muy grandes (100k+ filas) contempla usar un `POPULATE_BATCH_SIZE` menor (p. ej. 5000) o generar CSV y usar `COPY` de PostgreSQL para mayor rendimiento.

Ejemplos

Ejemplos y métodos recomendados

1) Ejecución local rápida (recomendada para pruebas y cargas grandes)
- Requisito: el puerto del primario Postgres (`pg-0`) está mapeado en el host (por ejemplo `5433`).
- Ventaja: evita iniciar un contenedor Node cada vez y es mucho más rápido.

PowerShell (desde la raíz del repo):
```powershell
$env:DB_HOST='localhost'
$env:DB_PORT='5433'
$env:DB_USER='postgres'
$env:DB_PASS='postgrespass'
$env:DB_NAME='appdb'
$env:POPULATE_TOTAL_CATEGORIAS=100
$env:POPULATE_TOTAL_CLUBS=10000
$env:POPULATE_TOTAL_PERSONAS=10000
# Opcional: forzar recreación de tablas (DESTRUCTIVO)
$env:POPULATE_FORCE='true'
node .\backend_FJV\scripts\populate_db.js
```

2) Ejecutar dentro de Docker (usa la red `hia-prod_dbnet`) — útil cuando el servicio DB solo es accesible desde la red compose
- Este método asegura que el script resuelva `pgpool` y se conecte a la BD levantada por `docker-compose`.
- Usa una imagen `node` temporal que instala dependencias y ejecuta el script.

PowerShell (desde la raíz del repo):
```powershell
docker run --rm -it `
  --network hia-prod_dbnet `
  --env-file ./backend_FJV/.env `
  -e POPULATE_TOTAL_CATEGORIAS=2 `
  -e POPULATE_TOTAL_CLUBS=5 `
  -e POPULATE_TOTAL_PERSONAS=10 `
  -v ${PWD}/backend_FJV:/app `
  -w /app `
  node:20-slim `
  bash -lc "npm ci --no-audit --no-fund && node scripts/populate_db.js"
```

3) Ejecutar localmente (si ya instalaste dependencias)

PowerShell:
```powershell
cd backend_FJV
npm install            # si no lo hiciste ya
$env:POPULATE_TOTAL_CATEGORIAS=2; $env:POPULATE_TOTAL_CLUBS=5; $env:POPULATE_TOTAL_PERSONAS=10; node .\scripts\populate_db.js
```

Notas sobre operaciones destructivas
- `POPULATE_FORCE=true` o pasar `--force` hace `sync({ force: true })` y RECREA las tablas — perderás datos actuales.
- Haz un backup (por ejemplo `pg_dump`) si necesitas conservar datos antes de ejecutar con `POPULATE_FORCE`.

Consejos de rendimiento y seguridad
- Para cargas muy grandes (>=100k filas) considera generar CSV y usar `COPY` de PostgreSQL o reducir `POPULATE_BATCH_SIZE` (por ejemplo 1000 o 2000) para bajar memoria usada por `bulkCreate`.
- Ejecutar contra el primario por `localhost:5433` fue más rápido en mi entorno que ejecutar cada vez en un contenedor Node que instala dependencias.

Resolución de problemas
- Timeout o ETIMEDOUT: ejecuta el script con `--network hia-prod_dbnet` (Docker) o conecta a `localhost:5433` si el primario está mapeado.
- Autenticación fallida con `pgpool`: si usas `pgpool` (puerto 5432), usa las credenciales que `pgpool` espera (revisa `PGPOOL_*` en `docker-compose.prod.yml` y variables en `.env`).
- Errores por arrays vacíos: el script ya incluye defensas para no llamar a `faker.helpers.arrayElement` con arrays vacíos (fallback a `null`).

Opciones adicionales
Si quieres, puedo también:
- Añadir una opción `--dry-run` que solo muestre los conteos y ejemplos sin insertar nada en la BD.
- Generar CSVs y un script auxiliar que haga `COPY` para cargas masivas (máximo rendimiento).

Resolución de problemas
- Problemas de autenticación: el script carga el `.env` en la raíz del repositorio si existe y mapea variables comunes de docker-compose (`POSTGRESQL_*`) a las esperadas por la configuración del proyecto (`DB_*`). Asegúrate de que `.env` contiene los valores correctos o define `DATABASE_URL`.
- Errores por constraints únicos: el script intenta evitarlos ajustando contadores, pero si aún aparecen duplicados considera ejecutar con `POPULATE_FORCE=true` en una BD de pruebas o limpiar manualmente las filas conflictivas.
- Errores de tipo "value too long": el script trunca campos usando la metadata del modelo; si tienes límites personalizados ajusta el modelo o el script según corresponda.

Opciones adicionales
Si quieres, puedo también:
- Añadir una opción `--dry-run` que solo muestre los conteos y ejemplos sin insertar nada en la BD.
- Generar CSVs y un script auxiliar que haga `COPY` para cargas masivas (máximo rendimiento).


