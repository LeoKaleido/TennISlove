# Ambiente di sviluppo in un unico container (D-054): Postgres, Mailpit, API e web.
# Si parte dall'immagine ufficiale di Postgres 17, così database e dati sono identici a quelli di produzione.
FROM postgres:17

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Node 22 dall'immagine ufficiale (solo node e i suoi moduli: /usr/local/bin ha già gli script di Postgres)
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
  && ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
  && corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH

# Mailpit, le email di sviluppo
COPY --from=axllent/mailpit:v1.21 /mailpit /usr/local/bin/mailpit

COPY docker/dev-start.sh /usr/local/bin/dev-start
WORKDIR /repo
CMD ["dev-start"]
