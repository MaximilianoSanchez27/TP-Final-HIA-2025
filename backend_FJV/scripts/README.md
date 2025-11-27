# Scripts: populate_db.js

Este archivo explica cómo usar el script `populate_db.js` para poblar la base de datos del proyecto con datos falsos, útil para desarrollo y pruebas.

> [!WARNING]
> Este script puede ser destructivo si se ejecuta con `POPULATE_FORCE=true` (puede eliminar tablas). Úsalo con cuidado y nunca contra bases de datos productivas.

## Ejecución del Script (Docker - Recomendado)

La forma más sencilla de ejecutar el script es usando el contenedor `backend-app` que ya tiene todas las dependencias instaladas:

```powershell
docker exec -it -e POPULATE_FORCE='true' -e POPULATE_TOTAL_CATEGORIAS=2 -e POPULATE_TOTAL_CLUBS=5 -e POPULATE_TOTAL_PERSONAS=10 backend-app node /usr/src/app/scripts/populate_db.js
```

Este comando:

- Ejecuta el script dentro del contenedor `backend-app` (sin necesidad de instalar dependencias localmente)
- Activa `POPULATE_FORCE='true'` para recrear las tablas ⚠️ **DESTRUCTIVO** - elimina datos existentes
- Define cuántos registros crear: 2 categorías, 5 clubes, 10 personas
- Se conecta automáticamente a la base de datos usando las variables de entorno del contenedor

### Ajustar la cantidad de datos

Modifica los valores según tus necesidades:

```powershell
# Ejemplo: más datos para pruebas más exhaustivas
docker exec -it -e POPULATE_FORCE='true' -e POPULATE_TOTAL_CATEGORIAS=10 -e POPULATE_TOTAL_CLUBS=50 -e POPULATE_TOTAL_PERSONAS=100 backend-app node /usr/src/app/scripts/populate_db.js
```

### Ejecutar sin recrear las tablas

Si solo quieres agregar datos sin borrar los existentes, omite `POPULATE_FORCE`:

```powershell
docker exec -it -e POPULATE_TOTAL_CATEGORIAS=5 -e POPULATE_TOTAL_CLUBS=10 -e POPULATE_TOTAL_PERSONAS=20 backend-app node /usr/src/app/scripts/populate_db.js
```

## Configuración (Variables de Entorno)

### Variables de Conexión a la Base de Datos

- `DB_HOST` - Host de PostgreSQL (ej: `localhost`)
- `DB_PORT` - Puerto de PostgreSQL (ej: `5433`)
- `DB_USER` - Usuario de PostgreSQL (ej: `postgres`)
- `DB_PASS` - Contraseña de PostgreSQL

### Variables de Población

- `POPULATE_TOTAL_CATEGORIAS` (por defecto: 100) - Número de categorías a crear
- `POPULATE_TOTAL_CLUBS` (por defecto: 200000) - Número de clubes a crear
- `POPULATE_TOTAL_PERSONAS` (por defecto: 200000) - Número de personas a crear
- `POPULATE_BATCH_SIZE` (por defecto: 10000) - Número de filas por lote en `bulkCreate`
- `POPULATE_FORCE` - Si es `true`, ejecuta `sync({ force: true })` y **RECREA las tablas**

## Comportamiento y Notas de Seguridad

- El script intenta reutilizar los modelos del proyecto en `backend_FJV/src/models/*` cuando existen. Si no encuentra los modelos, usa definiciones de ejemplo locales.
- Para evitar colisiones por constraints únicos, el script:
  - Detecta patrones deterministas de email/dni ya existentes (ej: `club123@example.com`, `persona456@example.com`) y ajusta los contadores internos para evitar duplicados.
  - Trunca las cadenas generadas para ajustarlas a la longitud de las columnas del modelo y así evitar errores tipo "value too long".
- Para importaciones muy grandes (100k+ filas) contempla usar un `POPULATE_BATCH_SIZE` menor (ej: 5000) o generar CSV y usar `COPY` de PostgreSQL para mayor rendimiento.

## Métodos Alternativos de Ejecución

### 1) Ejecución local (requiere npm install)

Si prefieres ejecutar el script localmente en tu máquina en lugar de usar Docker:

**Primero, instala las dependencias:**

```powershell
cd backend_FJV
npm install
```

**Luego ejecuta el script desde la raíz del proyecto:**

```powershell
$env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:DB_USER='postgres'; $env:DB_PASS='postgrespass'; $env:POPULATE_FORCE='true'; $env:POPULATE_TOTAL_CATEGORIAS=2; $env:POPULATE_TOTAL_CLUBS=5; $env:POPULATE_TOTAL_PERSONAS=10; node .\backend_FJV\scripts\populate_db.js
```

**O desde el directorio backend:**

```powershell
cd backend_FJV
$env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:DB_USER='postgres'; $env:DB_PASS='postgrespass'; $env:POPULATE_TOTAL_CATEGORIAS=2; $env:POPULATE_TOTAL_CLUBS=5; $env:POPULATE_TOTAL_PERSONAS=10; node .\scripts\populate_db.js
```

### 2) Ejecutar con contenedor temporal de Node

Útil cuando el servicio DB solo es accesible desde la red compose y no quieres usar el contenedor backend-app:

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

## Notas sobre Operaciones Destructivas

> [!CAUTION] > `POPULATE_FORCE=true` hace `sync({ force: true })` y **RECREA las tablas** — perderás todos los datos actuales.

- Haz un backup (ej: `pg_dump`) si necesitas conservar datos antes de ejecutar con `POPULATE_FORCE`.
- Nunca ejecutes este script con `POPULATE_FORCE=true` en bases de datos productivas.

## Consejos de Rendimiento

- Para cargas muy grandes (>=100k filas) considera:
  - Generar CSV y usar `COPY` de PostgreSQL
  - Reducir `POPULATE_BATCH_SIZE` (ej: 1000 o 2000) para bajar memoria usada por `bulkCreate`
- Ejecutar contra el primario por `localhost:5433` es generalmente más rápido que ejecutar en un contenedor Node que instala dependencias cada vez.

## Resolución de Problemas

### Problemas de Conexión

- **Timeout o ETIMEDOUT**: ejecuta el script con `--network hia-prod_dbnet` (Docker) o conecta a `localhost:5433` si el primario está mapeado.
- **Autenticación fallida con pgpool**: si usas `pgpool` (puerto 5432), usa las credenciales que `pgpool` espera (revisa `PGPOOL_*` en `docker-compose.prod.yml` y variables en `.env`).

### Problemas de Datos

- **Errores por constraints únicos**: el script intenta evitarlos ajustando contadores, pero si aún aparecen duplicados considera ejecutar con `POPULATE_FORCE=true` en una BD de pruebas o limpiar manualmente las filas conflictivas.
- **Errores "value too long"**: el script trunca campos usando la metadata del modelo; si tienes límites personalizados ajusta el modelo o el script según corresponda.
- **Errores por arrays vacíos**: el script ya incluye defensas para no llamar a `faker.helpers.arrayElement` con arrays vacíos (fallback a `null`).

## Opciones Adicionales

Si quieres, puedo también:

- Añadir una opción `--dry-run` que solo muestre los conteos y ejemplos sin insertar nada en la BD.
- Generar CSVs y un script auxiliar que haga `COPY` para cargas masivas (máximo rendimiento).
