# Brain — TenTennis

Documentazione viva del progetto. Ogni decisione o cambiamento di rotta va registrato in `00-history-decision-log.md`.

| Documento | Contenuto |
|---|---|
| [00-history-decision-log.md](00-history-decision-log.md) | Storico, decisioni prese (ADR leggeri), domande aperte |
| [01-product.md](01-product.md) | Visione di prodotto: app privata con area admin, utenti, funzionalità |
| [02-tech-frontend.md](02-tech-frontend.md) | Stack frontend e **regole sui testi (minimalismo)** |
| [03-tech-backend.md](03-tech-backend.md) | Stack e architettura backend (TS, Fastify + Prisma) |
| [04-flows.md](04-flows.md) | Flussi funzionali/tecnici e specifica del motore di punteggio |
| [05-runbook.md](05-runbook.md) | Come avviare l'app in locale e in produzione, sicurezza del server, backup |
| [06-regolamento.md](06-regolamento.md) | **Tutte le regole del torneo**, con la fonte. Se una regola non c'è, non si implementa |
| [reference/torneo-2026-27.md](reference/torneo-2026-27.md) | Dati del torneo: giocatori, calendario, risultati già registrati |
| [comunicazioni/](comunicazioni/) | Documenti mandati al cliente |
| [sources/](sources/) | Materiale originale ricevuto dal cliente (PDF regolamento, Excel, lista partecipanti) |

## Convenzioni
- Lingua: italiano.
- Le sezioni marcate **[DA DECIDERE]** sono ipotesi non ancora confermate.
- Le domande aperte vivono in un unico posto: la sezione "Domande aperte" del decision log.
- Testi dell'app minimi: si scrive solo ciò che serve per agire (D-045, dettagli in `02-tech-frontend.md`).
- Niente regole del torneo inventate: solo quelle di `06-regolamento.md`.
