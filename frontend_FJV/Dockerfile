# --- Etapa 1: Construir la App Angular ---
# Usamos la versión de Node que nos diste (v20)
FROM node:20-alpine AS build
WORKDIR /app

# Copia el package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias de Angular
RUN npm install

# Copia el resto del código fuente
COPY . .

# Construye la aplicación (script "build" de tu package.json)
RUN npm run build

# --- Etapa 2: Servir con Nginx ---
FROM nginx:stable-alpine

# Copia los archivos estáticos generados
# La carpeta "frontend-fjv" viene del "name" en tu package.json
# CORRECTO
COPY --from=build /app/dist/frontend-fjv/browser /usr/share/nginx/html

# Copia el archivo de configuración de Nginx que crearemos a continuación
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto 80 (HTTP)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]