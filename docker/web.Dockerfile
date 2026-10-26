# Immagine di produzione del web: build statica servita da Nginx, che fa anche da proxy per /api
FROM node:22-bookworm-slim AS build
RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @tentennis/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @tentennis/web build

FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx/https.conf.template docker/nginx/http-only.conf.template /etc/nginx/templates-available/
COPY docker/nginx/15-tentennis.sh /docker-entrypoint.d/
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
