FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
# Prisma probes OpenSSL to choose its query engine; without the openssl package
# it silently falls back to the OpenSSL 1.1 engine and fails to load at runtime.
RUN apk add --no-cache openssl
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
COPY server/prisma ./prisma/
RUN npm ci
COPY server/ ./
ENV DOCKER_BUILD=true
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=server-builder /app/server/package.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=client-builder /app/client/dist ../client/dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
