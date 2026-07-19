FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libssl3 libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:generate && npm run dev"]
