// Gestionale: anagrafica giocatori, amministratori e inviti (D-035, D-063).

import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAdmin, sendInvite, type CurrentUser } from '../auth';
import { audit, db } from '../db';

/** Ruolo admin e accesso: mai su se stessi, e resta sempre almeno un amministratore */
async function guardAdminChange(actor: CurrentUser, userId: string, reply: FastifyReply) {
  if (actor.id === userId) {
    reply.code(409).send({ error: 'Non puoi farlo sul tuo account: chiedi a un altro amministratore' });
    return false;
  }
  const target = await db.user.findUnique({ where: { id: userId } });
  if (target?.isAdmin && (await db.user.count({ where: { isAdmin: true, disabledAt: null } })) <= 1) {
    reply.code(409).send({ error: 'Serve almeno un amministratore' });
    return false;
  }
  return true;
}

/** Invito: manda email e password e, se l'accesso era revocato, lo riapre */
async function invite(user: { id: string; email: string }, firstName?: string) {
  await sendInvite(user, firstName);
  await db.user.update({ where: { id: user.id }, data: { invitedAt: new Date(), disabledAt: null } });
}

const playerBody = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  shortName: z.string().trim().min(1).max(30),
  email: z.string().trim().toLowerCase().email(),
  /** iscritto dal: per il badge Veterano; se manca resta quella già salvata (o oggi, per un giocatore nuovo) */
  memberSince: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function adminPlayerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  /** Giocatori e amministratori, con lo stato dell'accesso */
  app.get('/api/admin/people', async () => {
    const users = await db.user.findMany({
      include: {
        player: {
          include: {
            seasons: { include: { season: { select: { label: true } } } },
            _count: { select: { matchesAsA: true, matchesAsB: true } },
          },
        },
        sessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { email: 'asc' },
    });
    const players = await db.player.findMany({
      where: { userId: null },
      include: { _count: { select: { matchesAsA: true, matchesAsB: true } } },
    });
    return {
      people: [
        ...users.map((u) => ({
          userId: u.id,
          email: u.email,
          isAdmin: u.isAdmin,
          disabledAt: u.disabledAt?.toISOString() ?? null,
          invitedAt: u.invitedAt?.toISOString() ?? null,
          lastLoginAt: u.sessions[0]?.createdAt.toISOString() ?? null,
          player: u.player && {
            id: u.player.id,
            firstName: u.player.firstName,
            lastName: u.player.lastName,
            shortName: u.player.shortName,
            memberSince: u.player.memberSince,
            seasons: u.player.seasons.map((s) => s.season.label),
            hasMatches: u.player._count.matchesAsA + u.player._count.matchesAsB > 0,
          },
        })),
        // giocatori senza email (non possono entrare finché non gliene si assegna una)
        ...players.map((p) => ({
          userId: null,
          email: null,
          isAdmin: false,
          disabledAt: null,
          invitedAt: null,
          lastLoginAt: null,
          player: {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            shortName: p.shortName,
            memberSince: p.memberSince,
            seasons: [] as string[],
            hasMatches: p._count.matchesAsA + p._count.matchesAsB > 0,
          },
        })),
      ],
    };
  });

  app.post('/api/admin/players', async (req, reply) => {
    const body = playerBody.extend({ invite: z.boolean().default(false), isAdmin: z.boolean().default(false) }).parse(req.body);
    const existing = await db.user.findUnique({ where: { email: body.email }, include: { player: true } });
    if (existing?.player) return reply.code(409).send({ error: `Esiste già un giocatore con l'email ${body.email}` });

    const user = existing
      ? body.isAdmin
        ? await db.user.update({ where: { id: existing.id }, data: { isAdmin: true } })
        : existing
      : await db.user.create({ data: { email: body.email, isAdmin: body.isAdmin } });
    const player = await db.player.create({
      data: { firstName: body.firstName, lastName: body.lastName, shortName: body.shortName, memberSince: body.memberSince, userId: user.id },
    });
    await audit(req.user!.id, 'Player', player.id, 'create', null, body);
    if (body.invite) await invite(user, player.firstName);
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
      data: { firstName: body.firstName, lastName: body.lastName, shortName: body.shortName, memberSince: body.memberSince, userId },
    });
    await audit(req.user!.id, 'Player', player.id, 'update', { ...player, user: undefined, email: player.user?.email }, body);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/admin/users/:id/invite', async (req, reply) => {
    const user = await db.user.findUnique({ where: { id: req.params.id }, include: { player: true } });
    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });
    await invite(user, user.player?.firstName);
    await audit(req.user!.id, 'User', user.id, 'invite');
    return { ok: true };
  });

  /** Amministratore senza giocatore: entra solo nel gestionale */
  app.post('/api/admin/admins', async (req, reply) => {
    const body = z.object({ email: z.string().trim().toLowerCase().email(), invite: z.boolean().default(true) }).parse(req.body);
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing?.isAdmin) return reply.code(409).send({ error: `${body.email} è già amministratore` });
    const user = existing
      ? await db.user.update({ where: { id: existing.id }, data: { isAdmin: true } })
      : await db.user.create({ data: { email: body.email, isAdmin: true } });
    await audit(req.user!.id, 'User', user.id, existing ? 'grantAdmin' : 'createAdmin', null, body);
    if (body.invite) await invite(user);
    return { ok: true, userId: user.id };
  });

  /** Rende amministratore o toglie il ruolo */
  app.put<{ Params: { id: string } }>('/api/admin/users/:id/admin', async (req, reply) => {
    const { isAdmin } = z.object({ isAdmin: z.boolean() }).parse(req.body);
    const user = await db.user.findUnique({ where: { id: req.params.id }, include: { player: true } });
    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });
    if (!isAdmin && !(await guardAdminChange(req.user!, user.id, reply))) return;
    if (!isAdmin && !user.player) return reply.code(409).send({ error: 'Senza il ruolo admin questo account non servirebbe più: cancellalo' });
    if (isAdmin && user.disabledAt) return reply.code(409).send({ error: "L'accesso è revocato: reinvitalo prima" });
    await db.user.update({ where: { id: user.id }, data: { isAdmin } });
    await audit(req.user!.id, 'User', user.id, isAdmin ? 'grantAdmin' : 'revokeAdmin');
    return { ok: true };
  });

  /** Revoca l'accesso: il giocatore resta in calendario e classifica, ma non entra più. Reinvitarlo lo riapre */
  app.post<{ Params: { id: string } }>('/api/admin/users/:id/revoke', async (req, reply) => {
    const user = await db.user.findUnique({ where: { id: req.params.id } });
    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });
    if (!(await guardAdminChange(req.user!, user.id, reply))) return;
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { disabledAt: new Date(), isAdmin: false, passwordHash: null } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.loginCode.deleteMany({ where: { userId: user.id } }),
    ]);
    await audit(req.user!.id, 'User', user.id, 'revokeAccess', { isAdmin: user.isAdmin });
    return { ok: true };
  });

  /** Cancella un amministratore senza giocatore */
  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (req, reply) => {
    const user = await db.user.findUnique({ where: { id: req.params.id }, include: { player: true, _count: { select: { photos: true } } } });
    if (!user) return reply.code(404).send({ error: 'Utente non trovato' });
    if (user.player) return reply.code(409).send({ error: 'È un giocatore: cancellalo dalla sua scheda' });
    if (!(await guardAdminChange(req.user!, user.id, reply))) return;
    if (user._count.photos > 0) return reply.code(409).send({ error: "Ha caricato delle foto: revoca l'accesso invece di cancellarlo" });
    await db.user.delete({ where: { id: user.id } });
    await audit(req.user!.id, 'User', user.id, 'delete', { email: user.email, isAdmin: user.isAdmin });
    return { ok: true };
  });

  /** Cancella un giocatore senza partite (es. creato per sbaglio); con partite si revoca l'accesso */
  app.delete<{ Params: { id: string } }>('/api/admin/players/:id', async (req, reply) => {
    const player = await db.player.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { _count: { select: { photos: true } } } }, _count: { select: { matchesAsA: true, matchesAsB: true } } },
    });
    if (!player) return reply.code(404).send({ error: 'Giocatore non trovato' });
    if (player._count.matchesAsA + player._count.matchesAsB > 0) {
      return reply.code(409).send({ error: "Ha partite in calendario: revoca l'accesso invece di cancellarlo" });
    }
    const user = player.user;
    if (user && !(await guardAdminChange(req.user!, user.id, reply))) return;
    await db.$transaction(async (tx) => {
      await tx.prediction.deleteMany({ where: { playerId: player.id } });
      await tx.seasonPlayer.deleteMany({ where: { playerId: player.id } });
      await tx.player.delete({ where: { id: player.id } });
      // l'account va via con il giocatore; resta se è anche amministratore, o chiuso se ha caricato foto
      if (user && !user.isAdmin) {
        if (user._count.photos === 0) await tx.user.delete({ where: { id: user.id } });
        else await tx.user.update({ where: { id: user.id }, data: { disabledAt: new Date(), passwordHash: null } });
      }
    });
    await audit(req.user!.id, 'Player', player.id, 'delete', { firstName: player.firstName, lastName: player.lastName, email: user?.email });
    return { ok: true };
  });
}
