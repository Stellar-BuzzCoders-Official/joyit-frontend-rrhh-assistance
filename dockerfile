# Imagen base de Node.js
FROM node:22-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios
COPY package*.json ./
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto por defecto de Angular
EXPOSE 4200

# Ejecutar Angular en modo desarrollo
CMD ["npx", "ng", "serve", "--host", "0.0.0.0"]
