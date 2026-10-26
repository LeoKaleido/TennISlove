# Produzione in un unico container (D-054): Postgres, API e Nginx (file del web e proxy /api).
# HTTPS e certificati li gestisce il server davanti al container (D-056).
# Si parte dall'immagine ufficiale di Postgres 17, come in sviluppo.

# 1. build del web
FROM node:22-bookworm-slim AS web
RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @tentennis/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @tentennis/web build

# 2. container finale
FROM postgres:17
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default \
  && sed -i '/server_tokens/d' /etc/nginx/nginx.conf

# Node 22 dall'immagine ufficiale (solo node e i suoi moduli: /usr/local/bin ha già gli script di Postgres)
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && npm install -g pnpm@9.15.0

# API: dipendenze, sorgenti e client del database
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @tentennis/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN cd apps/api && pnpm prisma generate

# Web e Nginx
COPY --from=web /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/tennislove.conf /etc/nginx/templates/tennislove.conf

# L'API non gira come root; foto in una cartella dedicata
RUN useradd --system --no-create-home app \
  && mkdir -p /data/uploads \
  && chown -R app:app /data

COPY docker/prod-start.sh /usr/local/bin/prod-start
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads TRUST_PROXY=true
EXPOSE 80
CMD ["prod-start"]
