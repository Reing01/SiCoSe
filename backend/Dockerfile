FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libssl3 libc6-compat

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
