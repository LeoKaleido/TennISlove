// Login con magic link (D-014) e sessione in cookie httpOnly.

import { createHash, randomBytes } from 'node:crypto';
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

  app.post('/api/auth/magic-link', async (req) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    const user = await db.user.findUnique({ where: { email } });
    // Al massimo 3 link all'ora per email: protegge la quota di invio (D-030)
    const recent = user
      ? await db.magicLinkToken.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3_600_000) } } })
      : 0;
    // Risposta identica in ogni caso, per non rivelare chi è iscritto
    if (user && recent < 3) await sendLoginLink(user, 'login');
    return { ok: true };
  });

  app.post('/api/auth/verify', async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
    const record = await db.magicLinkToken.findUnique({ where: { tokenHash: hash(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.code(400).send({ error: 'Link scaduto o già usato. Richiedine uno nuovo.' });
    }
    await db.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    const sessionToken = newToken();
    const expiresAt = new Date(Date.now() + env.sessionDays * 86_400_000);
    await db.session.create({ data: { userId: record.userId, tokenHash: hash(sessionToken), expiresAt } });
    reply.setCookie(SESSION_COOKIE, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.secureCookies,
      expires: expiresAt,
    });
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

const INVITE_DAYS = 7;

/**
 * Crea un link monouso e lo manda per email (D-014, D-035).
 * L'invito dal gestionale vale 7 giorni, il link chiesto dalla pagina di login 15 minuti.
 */
export async function sendLoginLink(user: { id: string; email: string }, kind: 'login' | 'invite', firstName?: string) {
  const token = newToken();
  const minutes = kind === 'invite' ? INVITE_DAYS * 24 * 60 : env.magicLinkMinutes;
  await db.magicLinkToken.create({
    data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + minutes * 60_000) },
  });
  const link = `${env.appUrl}/auth/verify?token=${token}`;
  if (kind === 'invite') {
    await sendMail({
      to: user.email,
      subject: 'Sei nel torneo: entra in ATP Umbria Tournament',
      text: `Ciao${firstName ? ` ${firstName}` : ''}!\n\nSei stato iscritto ad ATP Umbria Tournament. Qui trovi calendario, classifica e le tue partite: programmi gli incontri, inserisci i risultati e carichi le foto.\n\nEntra con questo link (vale ${INVITE_DAYS} giorni e si usa una volta sola):\n\n${link}\n\nUna volta entrato resti collegato per ${env.sessionDays} giorni. Quando scade, chiedi un nuovo link dalla pagina di accesso con la tua email.`,
    });
  } else {
    await sendMail({
      to: user.email,
      subject: 'Il tuo link per entrare in ATP Umbria Tournament',
      text: `Ciao!\n\nTocca il link per entrare nell'app (vale ${env.magicLinkMinutes} minuti, si usa una volta sola):\n\n${link}\n\nSe non sei stato tu, ignora questa email.`,
    });
  }
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) return reply.code(401).send({ error: 'Non autenticato' });
  if (!req.user.isAdmin) return reply.code(403).send({ error: 'Solo per gli amministratori' });
}
