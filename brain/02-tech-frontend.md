# Tecnologia — Frontend

> Stato: in uso. TypeScript + React + Vite, React Router, TanStack Query. Riferimento UI: `design/mockup/`.

## Stack proposto

| Area | Scelta | Note |
|---|---|---|
| Linguaggio | TypeScript (strict) | confermato |
| UI | React | confermato |
| Build/dev | Vite | SPA veloce; in alternativa Next.js se serve SSR/SEO per il sito pubblico |
| Routing | React Router (o TanStack Router) | |
| Data fetching | TanStack Query | cache, invalidazione dopo l'inserimento di un risultato |
| Form e validazione | React Hook Form + Zod | schemi Zod **condivisi con il backend** (pacchetto `shared`) |
| Stile | CSS semplice con token (variabili CSS) dal mockup, `apps/web/src/styles.css` (D-032) | mobile-first, tema chiaro/scuro |
| PWA | vite-plugin-pwa | installabile sul telefono, eventuali notifiche push |
| Immagini | upload diretto su object storage con URL firmato; compressione lato client prima dell'upload | i selfie da telefono pesano 3–8 MB |
| Test | Vitest + Testing Library; Playwright per gli end-to-end | |
| i18n | solo italiano | |

## Architettura

- **Una sola app** (D-022), tutta dietro login (D-009). Aree: comune (`/`, `/classifica`, `/calendario`, `/partite/:id`, `/giocatori/:id`, `/gallery`), personale (`/me/...`) e gestionale (`/admin/...`, solo admin). Unica pagina libera: `/login` (+ `/auth/verify`).
- I risultati `PENDING` si riconoscono a colpo d'occhio (badge "Provvisorio"), in tutte le viste in cui compaiono.
- Il **motore di punteggio** vive in `packages/shared` (TS puro, senza dipendenze) e viene usato:
  - dal FE per l'anteprima live dei punti mentre si inserisce il punteggio e per validare il form;
  - dal BE come fonte di verità.

## Monorepo proposto

```
apps/
  web/        # React (pubblico + area giocatore + admin)
  api/        # Fastify
packages/
  shared/     # tipi, schemi Zod, motore di punteggio e classifica
```
Gestore pacchetti: pnpm workspaces **[DA DECIDERE]**.

## Linee guida UX
- Mobile-first: l'uso tipico è a bordo campo (selfie, risultato).
- Inserimento risultato con controlli numerici grandi (stepper 0–7 per i set), validazione immediata e messaggio chiaro, come la colonna "Messaggio" dell'Excel.
- Stati ben riconoscibili per ogni partita: Da programmare · Programmata · In corso · Giocata · Da verificare.
