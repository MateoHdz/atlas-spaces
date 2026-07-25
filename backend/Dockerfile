FROM node:20-alpine

WORKDIR /app

# Copiar definiciones de dependencias
COPY package*.json ./

# Instalación limpia de producción/dev
RUN npm ci

# Copiar código fuente
COPY . .

EXPOSE 4000

ENV NODE_ENV=production

CMD ["npm", "start"]
