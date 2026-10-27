# Runbook — avvio in locale e in produzione

> Stato al 26/10/2026: **locale pronto**. **Produzione installata sul server** (container unico dietro il web server del server, che fa l'HTTPS); in corso la messa a punto dell'invio email da Plesk, mai ancora installata su un VPS. Mancano il VPS, la scelta e l'acquisto del dominio (D-050) e la casella email su Plesk.

## Panoramica

Un **unico container** sia in locale sia in produzione (D-054), costruito sull'immagine ufficiale di Postgres 17. Dentro girano più programmi, avviati in ordine da uno script; se uno si ferma, si ferma il container.

| Programma | Locale (`docker-compose.yml`, `docker/dev.Dockerfile`) | Produzione (`docker-compose.prod.yml`, `docker/prod.Dockerfile`) |
|---|---|---|
| Postgres 17 | porta 5432 solo dal Mac | solo dentro il container |
| API Fastify | `tsx watch`, porta 3000 solo dal Mac | utente non root, solo dentro il container |
| Web | Vite dev server, porta 5173 | build statica servita da **Nginx**, che fa anche da proxy per `/api`, solo HTTP su `127.0.0.1:8080` |
| Mailpit | email di sviluppo, porta 8025 solo dal Mac | assente, le email partono da una casella su Plesk via SMTP (D-055) |
| HTTPS e certificati | — | **fuori dal container**: li gestisce il web server del server, che inoltra a `127.0.0.1:8080` (D-056) |

Script di avvio: `docker/dev-start.sh` e `docker/prod-start.sh`. L'app gira sempre in Docker (D-027); Node sul Mac serve solo all'editor (D-044).

**Cosa si accetta con il container unico** (scelta dell'utente, D-054):
- un riavvio, anche solo per aggiornare l'app, riavvia anche il database (pochi secondi);
- i log di tutti i programmi sono mescolati;
- Postgres, Node e Nginx si aggiornano insieme, ricostruendo l'immagine.

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
2. **Avvio**: `docker compose up -d`. La prima volta costruisce l'immagine. A ogni avvio il container accende il database, installa le dipendenze, applica le migrazioni ed esegue il seed (che non fa niente se i dati ci sono già), poi avvia API e web.
3. **Dati di prova da zero**: `docker compose exec -w /repo/apps/api app pnpm prisma migrate reset --force`. Ricrea il database ed esegue il seed:
   - torneo 2026/27 al 22/10, senza fase finale;
   - 12 giocatori, 11 giornate, 8 risultati;
   - i 9 circoli indicati da Giuseppe.
4. **Verifica**: `docker compose ps` mostra il container `healthy`, e http://localhost:3000/api/health risponde `{"ok":true}`.

### Indirizzi
- **App** (telefono): http://localhost:5173
- **Gestionale** (desktop): http://localhost:5173/admin
- **Email di sviluppo**: http://localhost:8025, i codici di accesso arrivano qui
- **API**: http://localhost:3000
- **Dal telefono, sulla stessa rete**: `http://<IP del Mac>:5173` (IP con `ipconfig getifaddr en0`). È l'unico servizio raggiungibile dalla rete locale; database, API e Mailpit rispondono solo dal Mac.
  - Il codice si legge su Mailpit dal Mac e si scrive nel telefono.
  - Perché l'indirizzo nell'email d'invito sia giusto anche dal telefono, in `.env` metti `APP_URL=http://<IP del Mac>:5173` e fai `docker compose up -d`.

### Entrare nell'app
1. Apri l'app e inserisci un'email presente in `apps/api/prisma/seed-data.ts`.
2. Apri Mailpit e scrivi il codice (è anche nell'oggetto dell'email).
- **Solo admin**: `giuseppe@kalei.do`, atterra su `/admin`.
- **Giocatore e admin**: `alessandro@kalei.do`.
- **Limite**: 3 codici all'ora per email. Se si supera, aspetta o resetta il db.

### Uso quotidiano
- **Accendere**: `docker compose up -d`
- **Spegnere** senza perdere dati: `docker compose stop`
- **Log** (tutti i programmi insieme): `docker compose logs -f`
- **Stato**: `docker compose ps`
- **Riavviare tutto**: `docker compose restart`

### Comandi di sviluppo
- **Test**: `docker compose exec app pnpm -r test`
- **Typecheck**: `docker compose exec app pnpm -r typecheck`
- **Dipendenze cambiate**: `docker compose restart` (le installa all'avvio)
- **Nuova migrazione**: `docker compose exec -w /repo/apps/api app pnpm prisma migrate dev --name <nome>`
- **Console del db**: `docker compose exec app psql -U tentennis tentennis`
- **Immagine cambiata** (`docker/dev.Dockerfile` o `docker/dev-start.sh`): `docker compose up -d --build`

### Ripartire da zero
- **Solo i dati**: `docker compose exec -w /repo/apps/api app pnpm prisma migrate reset --force`
- **Tutto** (db, dipendenze, cache): `docker compose down -v`, poi il primo avvio. Le foto restano in `uploads/`: cancellale a mano se vuoi.

### Problemi frequenti
- **Porta occupata** (5432, 3000, 5173, 8025): un altro processo la usa. Chiudilo o cambia la porta in `docker-compose.yml`.
- **Il container si riavvia o non diventa `healthy`**: uno dei programmi si è fermato. `docker compose logs --tail 100` mostra quale e perché.
- **Il codice non funziona**: è scaduto (15 minuti), già usato, superato da uno più nuovo o bloccato dopo 5 tentativi sbagliati. Chiedine un altro.
- **L'email non arriva in Mailpit**: controlla `docker compose logs` alla voce "Invio email fallito".
- **VS Code segna errori sugli import**: esegui `pnpm install` e `pnpm prisma generate` sul Mac (vedi Prerequisiti).

---

## Produzione

### File coinvolti
- **`docker-compose.prod.yml`**: il container unico `app`, raggiungibile solo dal server su `127.0.0.1:8080`, con i volumi di database e foto. Log ruotati, massimo 50 MB.
- **`docker/prod.Dockerfile`**: compila il web, poi parte da Postgres 17 e aggiunge Node, Nginx e l'API.
- **`docker/prod-start.sh`**: avvia in ordine database, migrazioni e API, Nginx.
- **`docker/nginx/tennislove.conf`**: Nginx del container (file del web, proxy verso l'API, header di sicurezza, limiti per IP). Legge l'IP reale del visitatore dall'intestazione `X-Forwarded-For` del server.
- **`scripts/backup.sh`**: backup di database e foto.
- **`.env.production.example`**: modello del file `.env` di produzione.

### Prerequisiti
- **VPS** Linux (Debian o Ubuntu) con Docker e il plugin compose. Bastano 2 core e 4 GB (D-023).
- **Dominio** (da scegliere, D-050), con un record A (ed eventualmente AAAA) che punta all'IP del VPS.
- **Casella email su Plesk** (D-055), per esempio `noreply@<dominio>`:
  - in Plesk, nelle impostazioni di posta del dominio, attivi **SPF**, **DKIM** e un record **DMARC**: senza, i codici di accesso finiscono nello spam;
  - controlla il limite di invii all'ora del server di posta: un torneo ne manda poche centinaia al mese, ma un invito a tutti i giocatori parte in un colpo solo;
  - prova l'invio da un client di posta prima di collegarla all'app;
  - come `SMTP_HOST` usa il nome per cui il server di posta ha un certificato valido (in Plesk, quello protetto con Let's Encrypt). Se il nome non corrisponde, l'invio fallisce per errore di certificato e nei log compare "Invio email fallito".

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
4. **Attenzione a Docker**: le porte pubblicate da Docker (`ports:`) scavalcano ufw. Per questo il container pubblica solo `127.0.0.1:8080`, raggiungibile dal server e non da internet. Non pubblicarne altre e non togliere `127.0.0.1`.
5. **Aggiornamenti automatici**: `apt install unattended-upgrades` e `dpkg-reconfigure unattended-upgrades`.
6. **Facoltativo**: `fail2ban` contro i tentativi di accesso SSH.
7. **Permessi del `.env`**: `chmod 600 .env`, perché contiene la password del db e quella della casella email.

### Primo rilascio
1. **Codice sul server**: clona il repo nella home di `deploy`. Il repo contiene `brain/sources` con le email dei giocatori: non deve mai finire su un remote pubblico.
2. **Ambiente**: `cp .env.production.example .env`, poi compila:
   - **`POSTGRES_PASSWORD`**: genera con `openssl rand -hex 32`;
   - **`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`**: server, indirizzo e password della casella su Plesk;
   - **`MAIL_FROM`**: un indirizzo sul dominio verificato.
3. **Avvio**: `docker compose -f docker-compose.prod.yml up -d --build`. Verifica dal server: `curl http://127.0.0.1:8080/api/health` risponde `{"ok":true}`.
4. **Web server del server (HTTPS)** (D-056): il dominio, con il suo certificato, inoltra tutto al container. Con Nginx sul server, un file in `sites-available` (poi collegato in `sites-enabled`):
   ```nginx
   server {
       listen 80;
       server_name <dominio>;
       return 301 https://$host$request_uri;
   }
   server {
       listen 443 ssl;
       http2 on;
       server_name <dominio>;
       ssl_certificate     /etc/letsencrypt/live/<dominio>/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/<dominio>/privkey.pem;
       # foto fino a 8 MB
       client_max_body_size 10m;
       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $remote_addr;
           proxy_set_header X-Forwarded-Proto https;
       }
   }
   ```
   Con Plesk: in "Impostazioni Apache e nginx" del dominio, le stesse righe di `location /` vanno nelle direttive aggiuntive di Nginx, con il certificato attivato da Plesk.
   - `X-Forwarded-For` serve ai limiti per IP: senza, tutti i visitatori sembrano la stessa persona.
   - `client_max_body_size` serve alle foto: senza, il server rifiuta quelle sopra 1 MB.
5. **Dati iniziali**, una sola volta:
   1. **Sul Mac, prima del rilascio**: fatti mandare da Giuseppe l'Excel aggiornato e rigenera i risultati:
      `cd apps/api && pnpm seed:excel <percorso dell'Excel>`
      - Lo script riscrive `apps/api/prisma/seed-results.json` e segnala le righe da controllare (punteggi non validi, giocatori diversi dal calendario, punti diversi dall'Excel).
      - Controlla l'elenco, committa il JSON e porta il codice sul server.
   2. **Sul server**: `docker compose -f docker-compose.prod.yml exec -w /app/apps/api app gosu app ./node_modules/.bin/tsx prisma/seed.ts`.
      - Crea torneo, giocatori, calendario, circoli, admin e i risultati del JSON, tutti confermati.
      - Se la stagione esiste già non fa niente: rilanciarlo per errore non fa danni.
   - Da quel momento la fonte è l'app: l'Excel non si usa più per aggiornare i dati.
   - Il seed in produzione **va lanciato a mano**: l'avvio del container applica solo le migrazioni (tabelle vuote). Senza seed non esistono utenti e nessuna email del codice parte.
6. **Verifica**:
   - `https://<dominio>/api/health` risponde `{"ok":true}`;
   - un login di prova con l'email di un admin arriva davvero nella casella;
   - una foto caricata da telefono si vede in gallery;
   - https://www.ssllabs.com/ssltest/ dà almeno A: verifica il certificato e l'HTTPS del server (D-056).
7. **Backup notturno**: `crontab -e` e aggiungi
   `30 3 * * * /home/deploy/tentennis/scripts/backup.sh /home/deploy/backups`
8. **Primo accesso al gestionale** (nessuno ha ancora una password): sul server `scripts/password.sh tua@email 'password-scelta'` (minimo 8 caratteri), poi entra su `/admin` con quella. Funziona per qualunque utente esistente, anche senza email.
9. **Inviti**: dal gestionale, sezione Giocatori, invia l'invito a ciascun giocatore: riceve indirizzo dell'app e una password (D-060). Gli admin senza giocatore (es. `giuseppe@kalei.do`) entrano con il codice via email.

### Uso quotidiano e problemi in produzione
I comandi passano da `docker compose -f docker-compose.prod.yml`, dalla cartella del progetto. Per usarli da qualunque cartella serve il nome del container: `docker ps --format '{{.Names}}'` (con il compose del repository è `tennislove-app-1`).
- **Log di tutto**: `docker compose -f docker-compose.prod.yml logs -f`
- **Email**: all'avvio il log scrive le impostazioni in uso (`Email: SMTP host:porta, SSL, utente, mittente`, mai la password); poi una riga per ogni invio:
  - `Email inviata a … (server: 250 …)`: partita e accettata dal server di posta. Se non arriva: spam, SPF/DKIM/DMARC su Plesk, log della posta di Plesk;
  - `Invio email fallito a …`: subito sotto c'è il motivo (certificato, password, mittente diverso dalla casella, connessione). Con porta e SSL sbagliati l'errore può comparire dopo 2-3 minuti;
  - nessuna riga dopo la richiesta: l'app ha risposto con un errore ("Email non registrata" se il seed non è fatto, oppure 3 codici già chiesti nell'ultima ora);
  - i codici nell'oggetto sono mascherati (`******`): nei log non finisce mai un codice valido.
- **Password**: con 5 errori di fila l'accesso con password si blocca per 15 minuti; entrare col codice lo sblocca. "Reinvia invito" dal gestionale manda una password nuova.
- **Password impostata dal server**: `scripts/password.sh nome@email.it 'password-scelta'`, quando la posta non funziona o per il primo accesso.
- **Codice d'emergenza senza email**: `scripts/codice.sh nome@email.it` crea un codice valido 15 minuti e lo stampa. Va scritto nell'app dopo aver chiesto "Inviami il codice" con la stessa email.
- **Dopo aver cambiato il `.env`**: `docker compose -f docker-compose.prod.yml up -d` (`restart` non rilegge il file).
- **Riavvii e dati**: riavviare, fermare, ricostruire con `up -d --build` o riavviare il server non tocca i dati (volumi). Si perdono solo con `down -v`, cancellando i volumi o **cambiando il `name:` del progetto** nel compose: Docker cercherebbe volumi con il nome nuovo e partirebbe con un database vuoto.

### Variabili d'ambiente
- **`HTTP_BIND`** (facoltativa): dove ascolta il container, predefinito `127.0.0.1:8080`.
- **`APP_URL`**: `https://<dominio>`, indirizzo citato nelle email (invito, partite).
- **`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`**: credenziali del db, usato solo dentro il container.
- **`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`**: la casella su Plesk. Server di solito `mail.<dominio>`, porta 465 (SSL) o 587 (TLS); utente = indirizzo completo della casella. I valori esatti sono in Plesk, nelle impostazioni del client di posta della casella.
- **`MAIL_FROM`**: mittente delle email.
- **Impostate dal compose, non vanno nel `.env`**:
  - `DATABASE_URL`: costruito dalle credenziali, punta al database nello stesso container;
  - `NODE_ENV=production`: cookie `Secure`;
  - `TRUST_PROXY=true`: IP reale dei client nei log;
  - `UPLOAD_DIR`.
- **Facoltative**: `SESSION_DAYS` (90), `LOGIN_CODE_MINUTES` (15), `LOG_LEVEL` (info).

### Aggiornare
**In automatico (D-074)**: ogni push su `main` aggiorna il server da solo.
1. GitHub chiama il webhook di Plesk, che fa il pull nella cartella `/var/www/vhosts/tennislove.it/httpdocs`.
2. Plesk lancia l'azione di deploy, impostata nella pagina Git del dominio:
   `cd /var/www/vhosts/tennislove.it/httpdocs && docker compose -p tennislove -f docker-compose.prod.yml up -d --build`
3. Il container si ricostruisce e si riavvia (pochi secondi di fermo, database compreso) e applica le migrazioni.

Perché funzioni:
- l'azione gira con l'utente di sistema del dominio, **`tennislove.it`** (proprietario della cartella), che deve essere nel gruppo `docker` (`usermod -aG docker tennislove.it`, da root) e avere una shell vera (`/bin/bash`, non chrooted) in "Accesso al server web";
- il `.env` di produzione sta in quella cartella (non è nel repo: il pull non lo tocca);
- il progetto Docker si chiama `tennislove`: `-p tennislove` e `name:` nel compose devono restare uguali al progetto che gira, altrimenti Docker crea volumi nuovi con un database vuoto.

Attenzione: chi è nel gruppo `docker` ha di fatto i poteri di root sul server, e il deploy esegue ciò che arriva dal repo: chi può fare push su `main` controlla il server. Repo privato, pochi collaboratori, accesso SSH di `tennislove.it` con chiave o password forte.

Controllo dopo un push: nella pagina Git di Plesk l'ultimo commit e il registro del deploy senza errori; `docker ps` mostra `tennislove-app-1` creato da pochi minuti; `curl http://127.0.0.1:8080/api/health` risponde `{"ok":true}`.

**A mano** (se il deploy automatico non parte):
1. **Backup** se l'aggiornamento contiene migrazioni: `scripts/backup.sh` (il deploy automatico non lo fa: prima di un push con migrazioni, fallo a mano).
2. `git pull`
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. `docker compose -f docker-compose.prod.yml logs -f`: il container si riavvia (database compreso, pochi secondi di fermo), applica le migrazioni, poi compare "Server listening".

### Backup e ripristino
- **Cosa salva `scripts/backup.sh`**:
  - `db-AAAA-MM-GG.dump`: il database;
  - `uploads-AAAA-MM-GG.tar.gz`: le foto.
  Tiene 14 giorni. I file sono leggibili solo dal proprietario.
- **Fuori dal server**: copia periodicamente la cartella dei backup altrove (snapshot del provider, `rclone` verso uno storage, o anche `scp` sul Mac). Un backup che sta solo sul VPS non protegge da un VPS perso.
- **Ripristino del db**:
  `docker compose -f docker-compose.prod.yml exec -T app sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean' < db-AAAA-MM-GG.dump`
- **Ripristino delle foto**:
  `docker compose -f docker-compose.prod.yml exec -T app tar -C /data -xzf - < uploads-AAAA-MM-GG.tar.gz`
- **Database e foto vanno ripristinati insieme**: il db contiene i nomi dei file.

### Protezioni già attive
- **Rete**:
  - il container ascolta solo su `127.0.0.1:8080`; database e API restano dentro il container;
  - HTTPS, redirect da HTTP e versioni di TLS li gestisce il web server del server.
- **Header di sicurezza**:
  - HSTS;
  - Content-Security-Policy: script solo dal sito, font solo da Google Fonts;
  - pagina non incorporabile in altri siti;
  - nessun Referer verso altri siti;
  - nessuna versione di Nginx esposta;
  - niente motori di ricerca: `X-Robots-Tag: noindex, nofollow` su ogni risposta, meta `robots` nella pagina e `robots.txt` che vieta tutto.
- **Limiti per IP**:
  - login: 10 richieste al minuto con piccola tolleranza, poi risposta 429;
  - resto dell'API: 20 richieste al secondo.
- **Login**:
  - codice di 6 cifre monouso, consumato in modo atomico, bloccato dopo 5 tentativi;
  - massimo 3 codici all'ora per email;
  - la risposta non rivela se un'email è iscritta.
- **Sessione**:
  - cookie `HttpOnly`, `Secure`, `SameSite=Lax`;
  - sessioni scadute cancellate in automatico.
- **Foto**:
  - riconosciute dal contenuto del file, non dal tipo dichiarato dal browser;
  - massimo 8 MB e 30 per partita;
  - servite solo a chi ha fatto login, con `nosniff`.
- **Processi**: l'API gira come utente non root (`app`), Postgres come `postgres`.

### Da non fare mai in produzione
- **`prisma migrate reset`** o **`migrate dev`**: cancellano o riscrivono il database.
- **`docker compose down -v`**: cancella i volumi, quindi database e foto.
- **Pubblicare porte** diverse da `127.0.0.1:8080`, o togliere `127.0.0.1`: scavalcherebbero il firewall.
- **Committare il `.env`**, o copiarlo in chat o via email.
