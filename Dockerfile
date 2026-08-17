FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate

ENV NODE_ENV=production

CMD ["npm", "run", "discord:attendance-bot"]
