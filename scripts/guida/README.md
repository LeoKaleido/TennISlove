# Screenshot della guida

La guida (`/guida`, `apps/web/src/pages/Guide.tsx`) usa le immagini in `apps/web/public/guida/`, fatte su un **torneo dimostrativo** con giocatori inventati (D-067). Si rifanno quando l'app cambia aspetto.

Tutto in sviluppo, con il container acceso e l'app su http://localhost:5173. Serve Google Chrome sul Mac.

```sh
# 1. torneo dimostrativo (diventa quello "in corso"): il token di sessione di Andrea va in un file
docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts create > /tmp/guida-token

# 2. screenshot: Chrome senza finestra, a misura di telefono, tema chiaro
node scripts/guida/screenshots.mjs /tmp/guida-token

# 3. via il torneo dimostrativo
docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts remove
rm /tmp/guida-token
```

Lo script trova le sezioni dal titolo (`h2`): se un titolo cambia, va cambiato anche in `screenshots.mjs`. Una nuova funzione nella guida vuole una sezione in `Guide.tsx`, uno screenshot in `screenshots.mjs` e un `HelpLink` accanto alla funzione nell'app.
