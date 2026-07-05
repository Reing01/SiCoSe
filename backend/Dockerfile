FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libssl3 libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
# POR SI DA ERROR ESTO ESTAVA ASI
# CMD ["npm", "run", "dev"]

CMD ["npm", "run", "start"]

