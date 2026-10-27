-- Data di iscrizione del giocatore (badge Veterano). YYYY-MM-DD nel fuso di Roma, come le date delle giornate.
ALTER TABLE "Player" ADD COLUMN "memberSince" TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD');

-- Giocatori esistenti: il giorno in cui è stato creato il loro account
UPDATE "Player" p SET "memberSince" = to_char(u."createdAt" AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD')
FROM "User" u WHERE u."id" = p."userId";
