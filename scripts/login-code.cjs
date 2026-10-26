// Codice di accesso d'emergenza, senza email: crea un codice valido per un utente e lo stampa.
// Si usa tramite scripts/codice.sh, dentro il container di produzione.
const { PrismaClient } = require('@prisma/client');
const { createHash, randomInt } = require('node:crypto');

const db = new PrismaClient();
(async () => {
  const email = (process.env.LOGIN_EMAIL || '').trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`Utente non trovato: ${email} non è nel database`);
    return;
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.loginCode.create({
    data: { userId: user.id, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(Date.now() + 15 * 60_000) },
  });
  console.log(`Codice per ${user.email}: ${code} (vale 15 minuti, una volta sola)`);
})().finally(() => db.$disconnect());
