// Login con codice di 6 cifre via email (D-049) e sessione in cookie httpOnly.

import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from './db';
import { env } from './env';
import { sendMail } from './mail';

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
    req.user = { id: u.id, email: u.email, isAdmin: u.isAdmin, playerId: u.player?.id ?? null };
  });

  app.post('/api/auth/code', async (req) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    const user = await db.user.findUnique({ where: { email } });
    // Al massimo 3 codici all'ora per email: protegge la quota di invio (D-030)
    const recent = user
      ? await db.loginCode.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3_600_000) } } })
      : 0;
    // Risposta identica in ogni caso, per non rivelare chi è iscritto
    if (user && recent < 3) await sendLoginCode(user);
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
    await startSession(reply, record.userId);
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
    return req.user;
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
    subject: `${code} è il tuo codice per TennISlove`,
    text: `Il tuo codice: ${code}\n\nVale ${env.loginCodeMinutes} minuti. Se non sei stato tu, ignora questa email.`,
  });
}

/** Invito dal gestionale (D-035): dice dove entrare; il codice lo chiede il giocatore dall'app */
export async function sendInvite(user: { email: string }, firstName?: string) {
  await sendMail({
    to: user.email,
    subject: 'Sei nel torneo: entra in TennISlove',
    text: `Ciao${firstName ? ` ${firstName}` : ''}!\n\nSei iscritto al torneo su TennISlove: calendario, classifica, risultati e foto delle partite.\n\nApri ${env.appUrl} ed entra con questa email: ti arriva un codice.`,
  });
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
  if (!req.user.isAdmin) return reply.code(403).send({ error: 'Solo per gli amministratori' });
}
