from node:20 as build

workdir /app

copy package.json package-lock.json ./
copy web ./web

workdir /app/web

run npm ci

run npm run build

from nginx:1.26-alpine

copy --from=build dist /usr/share/nginx/html
copy --from=build nginx/nginx.conf /etc/nginx/conf.d/default.conf
