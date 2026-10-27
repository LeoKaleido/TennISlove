# Screenshot della guida

La guida (`/guida`, `apps/web/src/pages/Guide.tsx`) usa le immagini in `apps/web/public/guida/`, fatte su due **tornei dimostrativi** con giocatori inventati (D-067): uno concluso e uno in corso, con le date calcolate da oggi. Si rifanno quando l'app cambia aspetto. La procedura completa è nella skill `aggiorna-guida` (`.claude/skills/aggiorna-guida/SKILL.md`).

Tutto in sviluppo, con il container acceso e l'app su http://localhost:5173. Serve Google Chrome sul Mac.

```sh
# 1. tornei dimostrativi (quello in corso diventa il torneo dell'app): il token di sessione di Andrea va in un file
docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts create > /tmp/guida-token

# 2. screenshot: Chrome senza finestra, a misura di telefono (l'app ha solo il tema scuro)
node scripts/guida/screenshots.mjs /tmp/guida-token

# 3. via i tornei dimostrativi
docker compose exec -T -w /repo/apps/api app node_modules/.bin/tsx prisma/demo-guida.ts remove
rm /tmp/guida-token
```

Lo script trova le sezioni dal titolo (`h2`): se un titolo cambia, va cambiato anche in `screenshots.mjs`. Una nuova funzione nella guida vuole una sezione in `Guide.tsx`, uno screenshot in `screenshots.mjs` e un `HelpLink` accanto alla funzione nell'app.
