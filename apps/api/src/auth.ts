// Login con password (mandata con l'invito, D-060) o con codice di 6 cifre via email (D-049); sessione in cookie httpOnly.

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from './db';
import { env } from './env';
import { sendMail } from './mail';
import { playerView } from './views';

export const SESSION_COOKIE = 'atp_session';

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
  playerId: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: CurrentUser | null;
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
const MAX_CODE_ATTEMPTS = 5;
const ACCESS_REVOKED = "L'accesso per questa email è stato revocato: chiedi a un amministratore";
const MAX_PASSWORD_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Password da mandare con l'invito: 10 caratteri, senza quelli che si confondono (0/O, 1/l/I) */
function newPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('');
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function checkPassword(password: string, stored: string) {
  const [, salt, key] = stored.split('$');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

async function startSession(reply: FastifyReply, userId: string) {
  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + env.sessionDays * 86_400_000);
  await db.session.create({ data: { userId, tokenHash: hash(sessionToken), expiresAt } });
  reply.setCookie(SESSION_COOKIE, sessionToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.secureCookies,
    expires: expiresAt,
  });
}

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (req) => {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return;
    const session = await db.session.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: { include: { player: true } } },
    });
    if (!session || session.expiresAt < new Date()) return;
    const u = session.user;
    if (u.disabledAt) return;
    req.user = { id: u.id, email: u.email, isAdmin: u.isAdmin, playerId: u.player?.id ?? null };
  });

  app.post('/api/auth/code', async (req, reply) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    const user = await db.user.findUnique({ where: { email } });
    // L'app dice se l'email non è iscritta (D-060): più semplice per i giocatori, a costo di rivelare chi partecipa
    if (!user) return reply.code(404).send({ error: 'Email non registrata' });
    if (user.disabledAt) return reply.code(403).send({ error: ACCESS_REVOKED });
    // Al massimo 3 codici all'ora per email: protegge la quota di invio (D-030)
    const recent = await db.loginCode.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
    if (recent >= 3) return reply.code(429).send({ error: "Troppi codici richiesti: riprova tra un'ora" });
    await sendLoginCode(user);
    return { ok: true };
  });

  /** Accesso con la password ricevuta nell'invito; dopo 5 errori di fila si blocca per 15 minuti */
  app.post('/api/auth/password', async (req, reply) => {
    const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).parse(req.body);
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return reply.code(404).send({ error: 'Email non registrata' });
    if (user.disabledAt) return reply.code(403).send({ error: ACCESS_REVOKED });
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return reply.code(429).send({ error: 'Troppi tentativi: riprova tra qualche minuto o ricevi un codice' });
    }
    if (!user.passwordHash) return reply.code(400).send({ error: 'Nessuna password per questa email: ricevi un codice' });
    if (!(await checkPassword(password, user.passwordHash))) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_PASSWORD_ATTEMPTS;
      await db.user.update({
        where: { id: user.id },
        data: lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: failed },
      });
      return reply.code(lock ? 429 : 400).send({ error: lock ? 'Troppi tentativi: riprova tra qualche minuto o ricevi un codice' : 'Password errata' });
    }
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await startSession(reply, user.id);
    return { ok: true };
  });

  /** Vale l'ultimo codice inviato, con al massimo 5 tentativi */
  app.post('/api/auth/login', async (req, reply) => {
    const { email, code } = z
      .object({ email: z.string().trim().toLowerCase().email(), code: z.string().trim().regex(/^\d{6}$/) })
      .parse(req.body);
    const invalid = () => reply.code(400).send({ error: 'Codice non valido o scaduto' });
    const user = await db.user.findUnique({ where: { email } });
    const record = user
      ? await db.loginCode.findFirst({
          where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    if (!record) return invalid();
    // ogni tentativo si conta prima di confrontare, anche con richieste in parallelo
    const counted = await db.loginCode.updateMany({
      where: { id: record.id, usedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (!counted.count || hash(code) !== record.codeHash) return invalid();
    // consumato in un'unica scrittura condizionata: due richieste in parallelo non aprono due sessioni
    const consumed = await db.loginCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!consumed.count) return invalid();
    // chi entra col codice sblocca anche l'accesso con password
    await db.user.update({ where: { id: record.userId }, data: { failedLogins: 0, lockedUntil: null } });
    await startSession(reply, record.userId);
    return { ok: true };
  });

  /** Nuova password dal profilo: basta essere dentro (anche entrati col codice, se la vecchia è dimenticata) */
  app.post('/api/me/password', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
    const { password } = z.object({ password: z.string().min(8, 'Almeno 8 caratteri').max(200) }).parse(req.body);
    await db.user.update({ where: { id: req.user.id }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
    return { ok: true };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
    // il proprio giocatore anche se non è in nessun torneo: il profilo lo mostra comunque (foto, badge)
    const player = req.user.playerId ? await db.player.findUnique({ where: { id: req.user.playerId } }) : null;
    return { ...req.user, player: player && playerView(player) };
  });
}

// L'hook che legge la sessione deve valere per tutte le rotte, non solo dentro questo plugin
(authPlugin as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;

/** Codice monouso per entrare (D-049): vale pochi minuti e si scrive nell'app */
async function sendLoginCode(user: { id: string; email: string }) {
  const code = newCode();
  await db.loginCode.create({
    data: { userId: user.id, codeHash: hash(code), expiresAt: new Date(Date.now() + env.loginCodeMinutes * 60_000) },
  });
  await sendMail({
    to: user.email,
    subject: `${code} è il tuo codice per TennIsLove`,
    text: `Il tuo codice: ${code}\n\nVale ${env.loginCodeMinutes} minuti. Se non sei stato tu, ignora questa email.`,
  });
}

/**
 * Invito dal gestionale (D-035, D-060): genera una nuova password, la salva come hash e la manda per email.
 * Reinvitare vale anche come reset della password.
 */
export async function sendInvite(user: { id: string; email: string }, firstName?: string) {
  const password = newPassword();
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
  await sendMail({
    to: user.email,
    subject: 'Sei nel torneo: entra in TennIsLove',
    text: `Ciao${firstName ? ` ${firstName}` : ''}!\n\nSei iscritto al torneo su TennIsLove: calendario, classifica, risultati e foto delle partite.\n\nApri ${env.appUrl} ed entra con:\nEmail: ${user.email}\nPassword: ${password}\n\nSe dimentichi la password, dalla pagina di accesso puoi farti mandare un codice via email.`,
  });
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
  if (!req.user.isAdmin) return reply.code(403).send({ error: 'Solo per gli amministratori' });
}
