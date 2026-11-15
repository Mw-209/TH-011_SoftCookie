FROM node:20-alpine AS builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

