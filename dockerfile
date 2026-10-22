# ==============================================================================
# STAGE 1: Compilación de la aplicación Angular (SSR)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente y compilar bundle de producción
COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: Servidor Node.js para producción (SSR Express Server)
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copiar manifiestos e instalar solo dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiar los artefactos compilados desde el builder
COPY --from=builder /app/dist/rrhh-assitance-ft ./dist/rrhh-assitance-ft

# Exponer el puerto configurado
EXPOSE 4000

# Ejecutar el servidor SSR en producción
CMD ["node", "dist/rrhh-assitance-ft/server/server.mjs"]
