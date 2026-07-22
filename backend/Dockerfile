FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./
EXPOSE 3001
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
