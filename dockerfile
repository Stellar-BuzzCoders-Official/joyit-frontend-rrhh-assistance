# Fase 1: Build Angular app
FROM node:22-alpine AS builder

WORKDIR /app

# Solo lo necesario para instalar dependencias
COPY package.json ./
COPY package-lock.json ./

RUN npm ci

# Copiar solo el código fuente
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public

RUN npm run build -- --output-path=dist

# Fase 2: Servir con Nginx
FROM nginx:alpine

# Copia build optimizado
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
