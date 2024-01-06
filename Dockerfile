FROM node:18-bullseye as bot

# Crear un directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto 8000
ARG RAILWAY_STATIC_URL
ARG PUBLIC_URL
ARG PORT

CMD ["node", "src/server.js"]