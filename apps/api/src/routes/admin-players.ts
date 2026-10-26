// Gestionale: anagrafica giocatori e inviti (D-035).

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, sendInvite } from '../auth';
import { audit, db } from '../db';

const playerBody = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  shortName: z.string().trim().min(1).max(30),
  email: z.string().trim().toLowerCase().email(),
});

export async function adminPlayerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  /** Giocatori e amministratori, con lo stato dell'accesso */
  app.get('/api/admin/people', async () => {
    const users = await db.user.findMany({
      include: {
        player: { include: { seasons: { include: { season: { select: { label: true } } } } } },
        sessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { email: 'asc' },
    });
    const players = await db.player.findMany({ where: { userId: null } });
    return {
      people: [
        ...users.map((u) => ({
          userId: u.id,
          email: u.email,
          isAdmin: u.isAdmin,
          invitedAt: u.invitedAt?.toISOString() ?? null,
          lastLoginAt: u.sessions[0]?.createdAt.toISOString() ?? null,
          player: u.player && {
            id: u.player.id,
            firstName: u.player.firstName,
            lastName: u.player.lastName,
            shortName: u.player.shortName,
            seasons: u.player.seasons.map((s) => s.season.label),
          },
        })),
        // giocatori senza email (non possono entrare finché non gliene si assegna una)
        ...players.map((p) => ({
          userId: null,
          email: null,
          isAdmin: false,
          invitedAt: null,
          lastLoginAt: null,
          player: { id: p.id, firstName: p.firstName, lastName: p.lastName, shortName: p.shortName, seasons: [] as string[] },
        })),
      ],
    };
  });

  app.post('/api/admin/players', async (req, reply) => {
    const body = playerBody.extend({ invite: z.boolean().default(false) }).parse(req.body);
    const existing = await db.user.findUnique({ where: { email: body.email }, include: { player: true } });
    if (existing?.player) return reply.code(409).send({ error: `Esiste già un giocatore con l'email ${body.email}` });

    const user = existing ?? (await db.user.create({ data: { email: body.email } }));
    const player = await db.player.create({
      data: { firstName: body.firstName, lastName: body.lastName, shortName: body.shortName, userId: user.id },
    });
    await audit(req.user!.id, 'Player', player.id, 'create', null, body);
    if (body.invite) {
      await sendInvite(user, player.firstName);
      await db.user.update({ where: { id: user.id }, data: { invitedAt: new Date() } });
    }
    return { ok: true, playerId: player.id, invited: body.invite };
  });

  app.patch<{ Params: { id: string } }>('/api/admin/players/:id', async (req, reply) => {
    const body = playerBody.parse(req.body);
    const player = await db.player.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!player) return reply.code(404).send({ error: 'Giocatore non trovato' });

    const owner = await db.user.findUnique({ where: { email: body.email }, include: { player: true } });
    if (owner && owner.player && owner.player.id !== player.id) {
      return reply.code(409).send({ error: `L'email ${body.email} è già di un altro giocatore` });
    }
    let userId = player.userId;
    if (player.user && player.user.email !== body.email) {
      if (owner) return reply.code(409).send({ error: `L'email ${body.email} è già usata da un altro account` });
      // cambio email: le sessioni aperte con la vecchia email vengono chiuse
      await db.user.update({ where: { id: player.user.id }, data: { email: body.email, invitedAt: null } });
      await db.session.deleteMany({ where: { userId: player.user.id } });
    } else if (!player.user) {
      userId = (owner ?? (await db.user.create({ data: { email: body.email } }))).id;
    }
    await db.player.update({
      where: { id: player.id },
      data: { firstName: body.firstName, lastName: body.lastName, shortName: body.shortName, userId },
    });
    await audit(req.user!.id, 'Player', player.id, 'update', { ...player, user: undefined, email: player.user?.email }, body);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/admin/users/:id/invite', async (req, reply) => {
    const user = await db.user.findUnique({ where: { id: req.params.id }, include: { player: true } });
    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });
    await sendInvite(user, user.player?.firstName);
    await db.user.update({ where: { id: user.id }, data: { invitedAt: new Date() } });
    await audit(req.user!.id, 'User', user.id, 'invite');
    return { ok: true };
  });
}
