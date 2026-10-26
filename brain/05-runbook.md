# Runbook — avvio in locale e in produzione

> Stato al 26/10/2026: **locale pronto**. **Produzione pronta nei file e provata in locale** (con un certificato di prova), mai ancora installata su un VPS. Mancano il VPS, la scelta e l'acquisto del dominio (D-050) e l'account Resend.

## Panoramica

| Servizio | Locale (`docker-compose.yml`) | Produzione (`docker-compose.prod.yml`) |
|---|---|---|
| `db` | Postgres 17, porta 5432 solo dal Mac | Postgres 17, nessuna porta esposta |
| `api` | Fastify con `tsx watch`, porta 3000 solo dal Mac | Fastify, utente non root, solo rete interna |
| `web` | Vite dev server, porta 5173, proxy `/api` → `api:3000` | **Nginx**: build statica, proxy `/api`, HTTPS (D-039) |
| `mailpit` | cattura le email, UI su porta 8025 solo dal Mac | assente, si usa Resend via SMTP (D-030) |
| `certbot` | assente | rinnova i certificati Let's Encrypt ogni 12 ore |

L'app gira sempre in Docker (D-027). Node sul Mac serve solo all'editor (D-044).

---

## Locale

### Prerequisiti
- **Docker Desktop** avviato.
- **Binario docker nel PATH**, se il terminale non lo trova:
  `export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"`
- **Node per l'editor** (facoltativo): installato in `~/.local` (Node 22, pnpm 9.15 via corepack). Dopo un cambio di dipendenze o dello schema Prisma:
  - `pnpm install`
  - `cd apps/api && pnpm prisma generate`

### Primo avvio
1. **File di ambiente**: `cp .env.example .env` (il file `.env` non va mai committato).
2. **Avvio**: `docker compose up -d`. La prima volta costruisce l'immagine e installa le dipendenze (servizio `install`), poi l'api esegue `prisma generate` e `prisma migrate deploy`.
3. **Dati di prova**: `docker compose exec api pnpm prisma migrate reset --force`. Ricrea il database ed esegue il seed:
   - torneo 2026/27 al 22/10, senza fase finale;
   - 12 giocatori, 11 giornate, 8 risultati;
   - i 9 circoli indicati da Giuseppe.
4. **Verifica**: http://localhost:3000/api/health deve rispondere `{"ok":true}`.

### Indirizzi
- **App** (telefono): http://localhost:5173
- **Gestionale** (desktop): http://localhost:5173/admin
- **Email di sviluppo**: http://localhost:8025, i codici di accesso arrivano qui
- **API**: http://localhost:3000
- **Dal telefono, sulla stessa rete**: `http://<IP del Mac>:5173` (IP con `ipconfig getifaddr en0`). È l'unico servizio raggiungibile dalla rete locale; database, API e Mailpit rispondono solo dal Mac.
  - Il codice si legge su Mailpit dal Mac e si scrive nel telefono.
  - Perché l'indirizzo nell'email d'invito sia giusto anche dal telefono, in `.env` metti `APP_URL=http://<IP del Mac>:5173` e fai `docker compose up -d api`.

### Entrare nell'app
1. Apri l'app e inserisci un'email presente in `apps/api/prisma/seed-data.ts`.
2. Apri Mailpit e scrivi il codice (è anche nell'oggetto dell'email).
- **Solo admin**: `giuseppe@kalei.do`, atterra su `/admin`.
- **Giocatore e admin**: `alessandro@kalei.do`.
- **Limite**: 3 link all'ora per email. Se si supera, aspetta o resetta il db.

### Uso quotidiano
- **Accendere**: `docker compose up -d`
- **Spegnere** senza perdere dati: `docker compose stop`
- **Log**: `docker compose logs -f api` (oppure `web`)
- **Stato dei container**: `docker compose ps`

### Comandi di sviluppo
- **Test**: `docker compose run --rm --no-deps -w /repo install pnpm -r test`
- **Typecheck**: `docker compose run --rm --no-deps -w /repo install pnpm -r typecheck`
- **Dipendenze cambiate**: `docker compose run --rm install`, poi `docker compose restart api web`
- **Nuova migrazione**: `docker compose exec api pnpm prisma migrate dev --name <nome>`
- **Console del db**: `docker compose exec db psql -U tentennis tentennis`

### Ripartire da zero
- **Solo i dati**: `docker compose exec api pnpm prisma migrate reset --force`
- **Tutto** (db, dipendenze, cache): `docker compose down -v`, poi il primo avvio. Le foto restano in `uploads/`: cancellale a mano se vuoi.

### Problemi frequenti
- **Porta occupata** (5432, 3000, 5173, 8025): un altro processo la usa. Chiudilo o cambia la porta in `docker-compose.yml`.
- **L'api non parte dopo un pull**: dipendenze o client Prisma vecchi. Esegui `docker compose run --rm install` e `docker compose restart api`.
- **Il codice non funziona**: è scaduto (15 minuti), già usato, superato da uno più nuovo o bloccato dopo 5 tentativi sbagliati. Chiedine un altro.
- **L'email non arriva in Mailpit**: controlla `docker compose logs api` alla voce "Invio email fallito".
- **VS Code segna errori sugli import**: esegui `pnpm install` e `pnpm prisma generate` sul Mac (vedi Prerequisiti).

---

## Produzione

### File coinvolti
- **`docker-compose.prod.yml`**: db, api, web (Nginx), certbot. Log ruotati, massimo 30 MB per servizio.
- **`docker/api.Dockerfile`**: immagine dell'API. Al primo avvio applica le migrazioni, poi parte il server.
- **`docker/web.Dockerfile`**: compila il web e lo mette in un'immagine Nginx.
- **`docker/nginx/https.conf.template`**: configurazione completa (HTTPS, header di sicurezza, limiti, proxy).
- **`docker/nginx/http-only.conf.template`**: usata solo finché manca il certificato.
- **`docker/nginx/15-tentennis.sh`**: all'avvio sceglie quale delle due usare e ricarica Nginx ogni 6 ore per prendere i certificati rinnovati.
- **`scripts/backup.sh`**: backup di database e foto.
- **`.env.production.example`**: modello del file `.env` di produzione.

### Prerequisiti
- **VPS** Linux (Debian o Ubuntu) con Docker e il plugin compose. Bastano 2 core e 4 GB (D-023).
- **Dominio** (da scegliere, D-050), con un record A (ed eventualmente AAAA) che punta all'IP del VPS.
- **Resend**:
  - dominio di invio verificato con SPF e DKIM, per esempio `mail.<dominio>` (D-030);
  - una API key.

### Mettere in sicurezza il server (una volta, prima di tutto)
1. **Utente dedicato**: crea un utente `deploy`, aggiungilo al gruppo `docker` e lavora sempre con quello, non con root.
2. **SSH**:
   - accesso solo con chiave;
   - in `/etc/ssh/sshd_config` imposta `PasswordAuthentication no` e `PermitRootLogin no`;
   - poi `systemctl restart ssh`, tenendo aperta la sessione attuale finché non hai verificato di rientrare.
3. **Firewall**:
   - `ufw default deny incoming`
   - `ufw allow 22,80,443/tcp`
   - `ufw enable`
4. **Attenzione a Docker**: le porte pubblicate da Docker (`ports:`) scavalcano ufw. Per questo in `docker-compose.prod.yml` solo Nginx ha `ports:`. Non aggiungerne ad altri servizi.
5. **Aggiornamenti automatici**: `apt install unattended-upgrades` e `dpkg-reconfigure unattended-upgrades`.
6. **Facoltativo**: `fail2ban` contro i tentativi di accesso SSH.
7. **Permessi del `.env`**: `chmod 600 .env`, perché contiene la password del db e la chiave di Resend.

### Primo rilascio
1. **Codice sul server**: clona il repo nella home di `deploy`. Il repo contiene `brain/sources` con le email dei giocatori: non deve mai finire su un remote pubblico.
2. **Ambiente**: `cp .env.production.example .env`, poi compila:
   - **`POSTGRES_PASSWORD`**: genera con `openssl rand -hex 32`;
   - **`SMTP_PASS`**: la API key di Resend;
   - **`MAIL_FROM`**: un indirizzo sul dominio verificato.
3. **Avvio senza certificato**: `docker compose -f docker-compose.prod.yml up -d --build`. Nginx parte in solo HTTP e risponde 503 a tutto tranne la verifica di Let's Encrypt.
4. **Certificato**:
   ```sh
   docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \
     certonly --webroot -w /var/www/certbot -d <dominio> \
     --email <tua email> --agree-tos --no-eff-email
   docker compose -f docker-compose.prod.yml restart web
   ```
   Dopo il riavvio Nginx trova il certificato e passa in HTTPS. Il rinnovo poi è automatico.
5. **Dati iniziali**, una sola volta:
   1. **Sul Mac, prima del rilascio**: fatti mandare da Giuseppe l'Excel aggiornato e rigenera i risultati:
      `cd apps/api && pnpm seed:excel <percorso dell'Excel>`
      - Lo script riscrive `apps/api/prisma/seed-results.json` e segnala le righe da controllare (punteggi non validi, giocatori diversi dal calendario, punti diversi dall'Excel).
      - Controlla l'elenco, committa il JSON e porta il codice sul server.
   2. **Sul server**: `docker compose -f docker-compose.prod.yml exec api ./node_modules/.bin/tsx prisma/seed.ts`.
      - Crea torneo, giocatori, calendario, circoli, admin e i risultati del JSON, tutti confermati.
      - Se la stagione esiste già non fa niente: rilanciarlo per errore non fa danni.
   - Da quel momento la fonte è l'app: l'Excel non si usa più per aggiornare i dati.
6. **Verifica**:
   - `https://<dominio>/api/health` risponde `{"ok":true}`;
   - un login di prova con l'email di un admin arriva davvero nella casella;
   - una foto caricata da telefono si vede in gallery;
   - https://www.ssllabs.com/ssltest/ dà almeno A.
7. **Backup notturno**: `crontab -e` e aggiungi
   `30 3 * * * /home/deploy/tentennis/scripts/backup.sh /home/deploy/backups`
8. **Inviti**: dal gestionale, sezione Giocatori, invia l'invito a ciascun giocatore.

### Variabili d'ambiente
- **`DOMAIN`**: il dominio, usato da Nginx e certbot.
- **`APP_URL`**: `https://<dominio>`, indirizzo citato nelle email (invito, partite).
- **`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`**: credenziali del db, usate solo dentro la rete di Docker.
- **`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`**: Resend. I valori nel modello (`smtp.resend.com`, 465, `resend`) vanno confermati nella dashboard di Resend.
- **`MAIL_FROM`**: mittente delle email.
- **Impostate dal compose, non vanno nel `.env`**:
  - `NODE_ENV=production`: cookie `Secure`;
  - `TRUST_PROXY=true`: IP reale dei client nei log;
  - `UPLOAD_DIR`.
- **Facoltative**: `SESSION_DAYS` (90), `LOGIN_CODE_MINUTES` (15), `LOG_LEVEL` (info).

### Aggiornare
1. **Backup** se l'aggiornamento contiene migrazioni: `scripts/backup.sh`.
2. `git pull`
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. `docker compose -f docker-compose.prod.yml logs -f api`: le migrazioni vengono applicate all'avvio, poi compare "Server listening".

### Backup e ripristino
- **Cosa salva `scripts/backup.sh`**:
  - `db-AAAA-MM-GG.dump`: il database;
  - `uploads-AAAA-MM-GG.tar.gz`: le foto.
  Tiene 14 giorni. I file sono leggibili solo dal proprietario.
- **Fuori dal server**: copia periodicamente la cartella dei backup altrove (snapshot del provider, `rclone` verso uno storage, o anche `scp` sul Mac). Un backup che sta solo sul VPS non protegge da un VPS perso.
- **Ripristino del db**:
  `docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean' < db-AAAA-MM-GG.dump`
- **Ripristino delle foto**:
  `docker compose -f docker-compose.prod.yml exec -T api tar -C /data -xzf - < uploads-AAAA-MM-GG.tar.gz`
- **Database e foto vanno ripristinati insieme**: il db contiene i nomi dei file.

### Protezioni già attive
- **Rete**:
  - da fuori si raggiunge solo Nginx (porte 80 e 443);
  - HTTP rimanda sempre a HTTPS, solo TLS 1.2 e 1.3.
- **Header di sicurezza**:
  - HSTS;
  - Content-Security-Policy: script solo dal sito, font solo da Google Fonts;
  - pagina non incorporabile in altri siti;
  - nessun Referer verso altri siti;
  - nessuna versione di Nginx esposta.
- **Limiti per IP**:
  - login: 10 richieste al minuto con piccola tolleranza, poi risposta 429;
  - resto dell'API: 20 richieste al secondo.
- **Login**:
  - codice di 6 cifre monouso, consumato in modo atomico, bloccato dopo 5 tentativi;
  - massimo 3 link all'ora per email;
  - la risposta non rivela se un'email è iscritta.
- **Sessione**:
  - cookie `HttpOnly`, `Secure`, `SameSite=Lax`;
  - sessioni scadute cancellate in automatico.
- **Foto**:
  - riconosciute dal contenuto del file, non dal tipo dichiarato dal browser;
  - massimo 8 MB e 30 per partita;
  - servite solo a chi ha fatto login, con `nosniff`.
- **Processi**: l'API gira come utente non root.

### Da non fare mai in produzione
- **`prisma migrate reset`** o **`migrate dev`**: cancellano o riscrivono il database.
- **`docker compose down -v`**: cancella i volumi, quindi database, foto e certificati.
- **Aggiungere `ports:`** a db o api: scavalcherebbe il firewall.
- **Committare il `.env`**, o copiarlo in chat o via email.
