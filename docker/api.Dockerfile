# Immagine di produzione dell'API (docker-compose.prod.yml)
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @tentennis/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN cd apps/api && pnpm prisma generate
# Le foto vivono in un volume; il processo non gira come root
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
WORKDIR /app/apps/api
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/tsx src/server.ts"]
