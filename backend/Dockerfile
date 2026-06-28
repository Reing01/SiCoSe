FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
# POR SI DA ERROR ESTO ESTAVA ASI
# CMD ["npm", "run", "dev"]

CMD ["npm", "run", "start"]
