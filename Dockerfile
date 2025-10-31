FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

CMD ["node", "index.js"]
