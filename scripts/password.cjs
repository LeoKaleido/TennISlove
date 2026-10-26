// Imposta la password di un utente dal server, senza email: per il primo accesso al gestionale
// o quando la posta non funziona. Stesso formato di apps/api/src/auth.ts (scrypt).
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const db = new PrismaClient();
(async () => {
  const email = (process.env.LOGIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.LOGIN_PASSWORD || '';
  if (password.length < 8) {
    console.log('La password deve avere almeno 8 caratteri');
    return;
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`Utente non trovato: ${email} non è nel database (hai fatto il seed?)`);
    return;
  }
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 64).toString('base64')}`;
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hash, failedLogins: 0, lockedUntil: null } });
  console.log(`Password impostata per ${user.email}${user.isAdmin ? ' (amministratore)' : ''}`);
})().finally(() => db.$disconnect());
