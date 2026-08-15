FROM node:26-alpine AS frontend-builder

WORKDIR /app/frontend

RUN apk upgrade --no-cache \
  && npm install --global npm@12.0.2

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:26-alpine AS backend-builder

WORKDIR /app/backend

RUN apk upgrade --no-cache \
  && apk add --no-cache openssl libssl3 libc6-compat \
  && npm install --global npm@12.0.2

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
  DIRECT_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
  REDIS_URL=redis://localhost:6379 \
  JWT_SECRET=placeholder-placeholder-placeholder \
  CORS_ORIGIN=https://example.com \
  npm run build

FROM node:26-alpine AS backend-production-dependencies

WORKDIR /app/backend

RUN apk upgrade --no-cache \
  && apk add --no-cache openssl libssl3 libc6-compat \
  && npm install --global npm@12.0.2

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev \
  && npm run prisma:generate \
  && npm cache clean --force

FROM node:26-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk upgrade --no-cache \
  && apk add --no-cache openssl libssl3 libc6-compat \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY --from=backend-production-dependencies /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "backend/dist/src/index.js"]
