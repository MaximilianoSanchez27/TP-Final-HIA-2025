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

PowerShell — prueba pequeña (igual que el ejemplo anterior):
```powershell
$env:POPULATE_TOTAL_CATEGORIAS=2; $env:POPULATE_TOTAL_CLUBS=5; $env:POPULATE_TOTAL_PERSONAS=10; node .\backend_FJV\scripts\populate_db.js
```

PowerShell — carga mayor controlada (no destructiva):
```powershell
$env:POPULATE_TOTAL_CLUBS=5000; $env:POPULATE_TOTAL_PERSONAS=20000; $env:POPULATE_BATCH_SIZE=2000; node .\backend_FJV\scripts\populate_db.js
```

PowerShell — destructiva (eliminará tablas):
```powershell
$env:POPULATE_FORCE='true'; node .\backend_FJV\scripts\populate_db.js
# o
node .\backend_FJV\scripts\populate_db.js --force
```

Resolución de problemas
- Problemas de autenticación: el script carga el `.env` en la raíz del repositorio si existe y mapea variables comunes de docker-compose (`POSTGRESQL_*`) a las esperadas por la configuración del proyecto (`DB_*`). Asegúrate de que `.env` contiene los valores correctos o define `DATABASE_URL`.
- Errores por constraints únicos: el script intenta evitarlos ajustando contadores, pero si aún aparecen duplicados considera ejecutar con `POPULATE_FORCE=true` en una BD de pruebas o limpiar manualmente las filas conflictivas.
- Errores de tipo "value too long": el script trunca campos usando la metadata del modelo; si tienes límites personalizados ajusta el modelo o el script según corresponda.

Opciones adicionales
Si quieres, puedo también:
- Añadir una opción `--dry-run` que solo muestre los conteos y ejemplos sin insertar nada en la BD.
- Generar CSVs y un script auxiliar que haga `COPY` para cargas masivas (máximo rendimiento).


