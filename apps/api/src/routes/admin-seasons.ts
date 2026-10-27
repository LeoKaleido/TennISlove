// Gestionale: tornei (stagioni) e circoli.

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { validateRoundRobin } from '@tentennis/shared';
import { z } from 'zod';
import { requireAdmin } from '../auth';
import { audit, db } from '../db';
import { seasonOverview } from '../views';
import { locateMissingClubs } from '../weather';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const seasonBody = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(20),
  subtitle: z.string().trim().max(80).optional(),
  /** quanti accedono alla fase finale; 0 = nessuna fase finale */
  qualifiers: z.number().int().min(0).max(32),
  playerIds: z.array(z.string()).min(2),
  clubIds: z.array(z.string()),
  rounds: z
    .array(
      z.object({
        startsOn: day,
        endsOn: day,
        pauseAfter: z.string().max(80).nullable(),
        pairs: z.array(z.tuple([z.string(), z.string()])),
      }),
    )
    .min(1),
});

const clubBody = z.object({
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).optional().nullable(),
  mapsUrl: z.string().trim().url().regex(/^https?:\/\//i, 'Il link deve iniziare con https://').optional().nullable().or(z.literal('')),
  active: z.boolean().default(true),
});

/** Posizione per il meteo, in sottofondo: il gestionale non aspetta Google Maps */
const relocate = (log: FastifyBaseLogger) => {
  locateMissingClubs((msg) => log.info(msg)).catch((e) => log.warn({ err: e }, 'Posizione dei circoli non ricavata'));
};

const code = (round: number, index: number) => `G${String(round).padStart(2, '0')}-${String(index).padStart(2, '0')}`;

export async function adminSeasonRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/api/admin/seasons', async () => {
    const seasons = await db.season.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { players: true } },
        matches: { select: { result: { select: { status: true } } } },
        rounds: { select: { startsOn: true, endsOn: true }, orderBy: { number: 'asc' } },
      },
    });
    const champions = await db.player.findMany({
      where: { id: { in: seasons.map((s) => s.championPlayerId).filter((id): id is string => !!id) } },
    });
    return seasons.map((s) => {
      const champion = champions.find((p) => p.id === s.championPlayerId);
      return {
        id: s.id,
        name: s.name,
        label: s.label,
        subtitle: s.subtitle,
        status: s.status,
        qualifiers: s.qualifiers,
        players: s._count.players,
        matches: s.matches.length,
        played: s.matches.filter((m) => m.result && m.result.status !== 'DISPUTED').length,
        rounds: s.rounds.length,
        startsOn: s.rounds[0]?.startsOn ?? null,
        endsOn: s.rounds[s.rounds.length - 1]?.endsOn ?? null,
        champion: champion ? `${champion.firstName} ${champion.lastName}` : null,
      };
    });
  });

  app.post('/api/admin/seasons', async (req, reply) => {
    const body = seasonBody.parse(req.body);
    const problem = validateRoundRobin(
      body.playerIds,
      body.rounds.map((r) => r.pairs),
    );
    if (problem) return reply.code(400).send({ error: problem });
    if (await db.season.findFirst({ where: { name: body.name, label: body.label } })) {
      return reply.code(409).send({ error: `Esiste già ${body.name} ${body.label}` });
    }

    // Un solo torneo in corso: se ce n'è già uno, il nuovo resta in programma (DRAFT) finché non lo si avvia
    const running = await db.season.findFirst({ where: { status: 'ACTIVE' } });
    const season = await db.$transaction(async (tx) => {
      const s = await tx.season.create({
        data: {
          name: body.name,
          label: body.label,
          subtitle: body.subtitle || null,
          qualifiers: body.qualifiers,
          status: running ? 'DRAFT' : 'ACTIVE',
        },
      });
      await tx.seasonPlayer.createMany({ data: body.playerIds.map((playerId, i) => ({ seasonId: s.id, playerId, seedOrder: i })) });
      await tx.seasonClub.createMany({ data: body.clubIds.map((clubId) => ({ seasonId: s.id, clubId })) });
      for (const [r, round] of body.rounds.entries()) {
        const created = await tx.round.create({
          data: { seasonId: s.id, number: r + 1, startsOn: round.startsOn, endsOn: round.endsOn, pauseAfter: round.pauseAfter },
        });
        await tx.match.createMany({
          data: round.pairs.map(([a, b], m) => ({
            seasonId: s.id,
            roundId: created.id,
            code: code(r + 1, m + 1),
            playerAId: a,
            playerBId: b,
          })),
        });
      }
      return s;
    });
    await audit(req.user!.id, 'Season', season.id, 'create', null, { ...body, rounds: body.rounds.length });
    return { ok: true, seasonId: season.id, status: season.status };
  });

  app.post<{ Params: { id: string } }>('/api/admin/seasons/:id/activate', async (req, reply) => {
    const season = await db.season.findUnique({ where: { id: req.params.id } });
    if (!season || season.status !== 'DRAFT') return reply.code(404).send({ error: 'Torneo in programma non trovato' });
    const running = await db.season.findFirst({ where: { status: 'ACTIVE' } });
    if (running) return reply.code(409).send({ error: `Prima chiudi ${running.name} ${running.label}` });
    await db.season.update({ where: { id: season.id }, data: { status: 'ACTIVE' } });
    await audit(req.user!.id, 'Season', season.id, 'activate');
    return { ok: true };
  });

  /** Chiude il torneo: passa in archivio, consultabile da tutti; campione = primo in classifica se da solo */
  app.post<{ Params: { id: string } }>('/api/admin/seasons/:id/archive', async (req, reply) => {
    const season = await db.season.findUnique({ where: { id: req.params.id } });
    if (!season) return reply.code(404).send({ error: 'Torneo non trovato' });
    const { standings } = await seasonOverview(season);
    const leaders = standings.filter((s) => s.position === 1);
    const championPlayerId = leaders.length === 1 && leaders[0]!.points > 0 ? leaders[0]!.playerId : null;
    await db.season.update({ where: { id: season.id }, data: { status: 'ARCHIVED', championPlayerId } });
    await audit(req.user!.id, 'Season', season.id, 'archive', { status: season.status }, { championPlayerId });
    return { ok: true, championPlayerId };
  });

  app.get('/api/admin/clubs', async () => {
    const clubs = await db.club.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { matches: true } } } });
    return clubs.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      mapsUrl: c.mapsUrl,
      active: c.active,
      matches: c._count.matches,
      located: c.latitude !== null && c.longitude !== null,
    }));
  });

  app.post('/api/admin/clubs', async (req) => {
    const body = clubBody.parse(req.body);
    const club = await db.club.create({ data: { ...body, mapsUrl: body.mapsUrl || null } });
    relocate(req.log);
    // un nuovo circolo è subito disponibile nel torneo in corso
    const current = await db.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
    if (current) await db.seasonClub.create({ data: { seasonId: current.id, clubId: club.id } });
    await audit(req.user!.id, 'Club', club.id, 'create', null, body);
    return { ok: true, clubId: club.id };
  });

  app.patch<{ Params: { id: string } }>('/api/admin/clubs/:id', async (req, reply) => {
    const body = clubBody.parse(req.body);
    const club = await db.club.findUnique({ where: { id: req.params.id } });
    if (!club) return reply.code(404).send({ error: 'Circolo non trovato' });
    const moved = (body.mapsUrl || null) !== club.mapsUrl || (body.city ?? null) !== club.city;
    // link o città cambiati: la posizione per il meteo si ricava di nuovo
    await db.club.update({
      where: { id: club.id },
      data: { ...body, mapsUrl: body.mapsUrl || null, ...(moved ? { latitude: null, longitude: null } : {}) },
    });
    if (moved) relocate(req.log);
    await audit(req.user!.id, 'Club', club.id, 'update', club, body);
    return { ok: true };
  });
}
