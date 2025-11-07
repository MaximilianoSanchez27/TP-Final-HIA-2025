# Usa la versión de Node que nos diste (v20)
FROM node:20-alpine
WORKDIR /usr/src/app

# Copia el package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias de producción
# Usamos 'npm ci' porque es más rápido y seguro para CI/CD
RUN npm ci --only=production

# Copia el resto del código de tu aplicación
COPY . .

# Expone el puerto que usa tu app (Asumo 3000)
# Si tu app (src/index.js) usa otro puerto, cámbialo aquí
EXPOSE 3000

# El comando para iniciar, tomado de tu "start" script
CMD [ "node", "src/index.js" ]