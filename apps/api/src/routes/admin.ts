// Gestionale (/admin): per ora dashboard, utenti e risultati.

import type { FastifyInstance } from 'fastify';
import { evaluateMatch } from '@tentennis/shared';
import { requireAdmin } from '../auth';
import { audit, db } from '../db';
import { resultBody, resultRecord } from './matches';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/api/admin/users', async () => {
    const users = await db.user.findMany({
      include: { player: true, sessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { email: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      playerId: u.player?.id ?? null,
      lastLoginAt: u.sessions[0]?.createdAt.toISOString() ?? null,
    }));
  });

  /** Inserisce o corregge un risultato: dal gestionale è subito confermato */
  app.put<{ Params: { id: string } }>('/api/admin/matches/:id/result', async (req, reply) => {
    const input = resultBody.parse(req.body);
    const match = await db.match.findUnique({ where: { id: req.params.id }, include: { result: true } });
    if (!match) return reply.code(404).send({ error: 'Partita non trovata' });
    const ev = evaluateMatch(input);
    if (ev.status !== 'OK') return reply.code(400).send({ error: ev.message });
    const data = resultRecord(input, req.user!.id, null);
    await db.matchResult.upsert({ where: { matchId: match.id }, create: { matchId: match.id, ...data }, update: data });
    await audit(req.user!.id, 'MatchResult', match.id, match.result ? 'admin-update' : 'admin-create', match.result, data);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/admin/matches/:id/result/force-confirm', async (req, reply) => {
    const result = await db.matchResult.findUnique({ where: { matchId: req.params.id } });
    if (!result) return reply.code(404).send({ error: 'Nessun risultato' });
    await db.matchResult.update({
      where: { matchId: result.matchId },
      data: { status: 'CONFIRMED', confirmedById: req.user!.id, confirmedAt: new Date() },
    });
    await audit(req.user!.id, 'MatchResult', result.matchId, 'force-confirm', { status: result.status });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/admin/matches/:id/result', async (req, reply) => {
    const result = await db.matchResult.findUnique({ where: { matchId: req.params.id } });
    if (!result) return reply.code(404).send({ error: 'Nessun risultato' });
    await db.matchResult.delete({ where: { matchId: result.matchId } });
    await audit(req.user!.id, 'MatchResult', result.matchId, 'delete', result);
    return { ok: true };
  });
}
