from node:20-alpine as build

workdir /app

copy package.json package-lock.json ./
copy api ./api

workdir /app/api

run npm ci

env NODE_ENV="production"

cmd npm run start
