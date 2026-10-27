// Azioni dei giocatori sulle proprie partite: programmare, rinviare, inserire/confermare/contestare il risultato.

import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  clubSurfaces,
  evaluateMatch,
  formatDayWithWeekday,
  formatScore,
  fromRomeLocal,
  predictionsOpen,
  SURFACE_LABEL,
  SURFACES,
  type MatchScoreInput,
  type Surface,
} from '@tentennis/shared';
import { z } from 'zod';
import { requireUser, type CurrentUser } from '../auth';
import { audit, db } from '../db';
import { env } from '../env';
import { googleCalendarUrl, toIcs, type CalendarEvent } from '../ics';
import { sendMail } from '../mail';
import { matchInclude, scoreInput, toView } from '../views';
import { matchWeather } from '../weather';

const fullMatch = (id: string) =>
  db.match.findUnique({
    where: { id },
    include: {
      ...matchInclude,
      season: true,
      club: true,
      playerA: { include: { user: true } },
      playerB: { include: { user: true } },
    },
  });

type FullMatch = NonNullable<Awaited<ReturnType<typeof fullMatch>>>;

const isPlayerOf = (user: CurrentUser, m: FullMatch) =>
  user.playerId !== null && (user.playerId === m.playerAId || user.playerId === m.playerBId);

const matchTitle = (m: FullMatch) => `${m.playerA.shortName} vs ${m.playerB.shortName}`;

/** " Campo in terra rossa." per email e calendario, se la superficie è indicata */
const surfaceText = (surface: string | null) =>
  surface && surface in SURFACE_LABEL ? ` Campo in ${SURFACE_LABEL[surface as Surface].toLowerCase()}.` : '';

export function calendarEvent(m: FullMatch): CalendarEvent | null {
  if (!m.scheduledAt) return null;
  return {
    uid: m.id,
    sequence: m.scheduleSeq,
    start: m.scheduledAt,
    durationMinutes: 120,
    title: `Tennis: ${matchTitle(m)}`,
    location: m.club ? [m.club.name, m.club.city].filter(Boolean).join(', ') : (m.venue ?? ''),
    description: `Giornata ${m.round.number}.${surfaceText(m.surface)}\n${env.appUrl}/partite/${m.id}`,
  };
}

async function loadForAction(id: string, user: CurrentUser, reply: FastifyReply) {
  const m = await fullMatch(id);
  if (!m) {
    reply.code(404).send({ error: 'Partita non trovata' });
    return null;
  }
  if (!isPlayerOf(user, m) && !user.isAdmin) {
    reply.code(403).send({ error: 'Puoi agire solo sulle tue partite' });
    return null;
  }
  if (m.season.status !== 'ACTIVE') {
    reply.code(409).send({ error: 'Il torneo non è in corso' });
    return null;
  }
  return m;
}

/**
 * Dati da salvare per un risultato. Con `autoConfirmDays` resta in attesa di conferma (inserito da un giocatore),
 * con `null` è subito confermato (inserito da un amministratore).
 */
export function resultRecord(input: MatchScoreInput, actorId: string, autoConfirmDays: number | null) {
  const now = new Date();
  const confirmed = autoConfirmDays === null;
  return {
    timeExpired: input.timeExpired,
    set1A: input.set1?.a ?? null,
    set1B: input.set1?.b ?? null,
    set2A: input.set2?.a ?? null,
    set2B: input.set2?.b ?? null,
    stbA: input.stb?.a ?? null,
    stbB: input.stb?.b ?? null,
    submittedById: actorId,
    submittedAt: now,
    status: confirmed ? ('CONFIRMED' as const) : ('PENDING' as const),
    autoConfirmAt: confirmed ? null : new Date(now.getTime() + autoConfirmDays * 86_400_000),
    confirmedById: confirmed ? actorId : null,
    confirmedAt: confirmed ? now : null,
    confirmedAutomatically: false,
    disputeNote: null,
    disputedAt: null,
  };
}

const pair = z.object({ a: z.number().int().min(0), b: z.number().int().min(0) }).nullable();
export const resultBody = z.object({ timeExpired: z.boolean(), set1: pair, set2: pair, stb: pair });

export async function matchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser);

  app.get<{ Params: { id: string } }>('/api/matches/:id', async (req, reply) => {
    const m = await fullMatch(req.params.id);
    if (!m) return reply.code(404).send({ error: 'Partita non trovata' });
    const photos = await db.matchPhoto.findMany({ where: { matchId: m.id }, orderBy: { createdAt: 'asc' } });
    const event = calendarEvent(m);
    return {
      seasonId: m.seasonId,
      match: toView(m),
      club: m.club && { id: m.club.id, name: m.club.name, city: m.club.city, mapsUrl: m.club.mapsUrl },
      round: { number: m.round.number, startsOn: m.round.startsOn, endsOn: m.round.endsOn },
      photos: photos.map((p) => ({ id: p.id, url: `/api/photos/${p.id}`, uploadedById: p.uploadedById })),
      googleCalendarUrl: event ? googleCalendarUrl(event) : null,
    };
  });

  /** Meteo della partita (D-065): solo programmata in un circolo con posizione, entro le previsioni disponibili */
  app.get<{ Params: { id: string } }>('/api/matches/:id/weather', async (req, reply) => {
    const m = await db.match.findUnique({ where: { id: req.params.id }, include: { club: true, result: true } });
    if (!m) return reply.code(404).send({ error: 'Partita non trovata' });
    if (!m.scheduledAt || !m.club || m.result) return { weather: null };
    try {
      return { weather: await matchWeather(m.club, m.scheduledAt) };
    } catch (e) {
      // il meteo è un di più: se Open-Meteo non risponde la scheda resta com'è
      req.log.warn({ err: e }, 'Meteo non disponibile');
      return { weather: null };
    }
  });

  app.get<{ Params: { id: string } }>('/api/matches/:id/calendar.ics', async (req, reply) => {
    const m = await fullMatch(req.params.id);
    const event = m && calendarEvent(m);
    if (!event) return reply.code(404).send({ error: 'Partita non ancora programmata' });
    return reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="partita-${m!.code}.ics"`)
      .send(toIcs(event));
  });

  app.put<{ Params: { id: string } }>('/api/matches/:id/schedule', async (req, reply) => {
    const body = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        // un circolo della lista oppure un campo scritto a mano (D-040)
        clubId: z.string().min(1).nullish(),
        venue: z.string().trim().min(2).max(120).nullish(),
        // superficie tra quelle del circolo (D-075); con un campo fuori lista, una qualunque o nessuna
        surface: z.enum(SURFACES).nullish(),
      })
      .refine((b) => !!b.clubId !== !!b.venue, 'Scegli un circolo oppure scrivi dove giocate')
      .parse(req.body);
    const m = await loadForAction(req.params.id, req.user!, reply);
    if (!m) return;
    if (m.result) return reply.code(409).send({ error: 'La partita è già stata giocata' });
    const link = body.clubId ? await db.seasonClub.findFirst({ where: { seasonId: m.seasonId, clubId: body.clubId }, include: { club: true } }) : null;
    if (body.clubId && !link) return reply.code(400).send({ error: 'Circolo non disponibile per questo torneo' });
    // circolo con una sola superficie: è quella; con più superfici si sceglie tra le sue
    const offered = link ? clubSurfaces(link.club.surfaces) : [];
    const surface = body.surface ?? (offered.length === 1 ? offered[0]! : null);
    if (link && surface && offered.length > 0 && !offered.includes(surface)) {
      return reply.code(400).send({ error: `Al ${link.club.name} non ci sono campi in ${SURFACE_LABEL[surface].toLowerCase()}` });
    }

    const scheduledAt = fromRomeLocal(body.date, body.time);
    const updated = await db.match.update({
      where: { id: m.id },
      data: { scheduledAt, clubId: body.clubId ?? null, venue: body.venue ?? null, surface, postponedAt: null, scheduleSeq: { increment: 1 } },
    });
    await audit(req.user!.id, 'Match', m.id, 'schedule', { scheduledAt: m.scheduledAt, clubId: m.clubId, venue: m.venue, surface: m.surface }, { ...body, surface });

    const fresh = (await fullMatch(m.id))!;
    const event = calendarEvent(fresh)!;
    const when = `${formatDayWithWeekday(body.date)} alle ${body.time}`;
    for (const p of [fresh.playerA, fresh.playerB]) {
      if (!p.user) continue;
      await sendMail({
        to: p.user.email,
        subject: `${matchTitle(fresh)}: ${when}`,
        text: `La partita ${matchTitle(fresh)} è in programma ${when}${event.location ? ` a ${event.location}` : ''}.${surfaceText(fresh.surface)}\n\nAggiungila al calendario con il file allegato oppure su Google Calendar:\n${googleCalendarUrl(event)}\n\nDettagli nell'app:\n${env.appUrl}/partite/${fresh.id}`,
        attachments: [{ filename: `partita-${fresh.code}.ics`, content: toIcs(event), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
      });
    }
    return { ok: true, scheduleSeq: updated.scheduleSeq };
  });

  /** Pronostico su una partita altrui (D-061): si può cambiare fino all'inizio della partita */
  app.put<{ Params: { id: string } }>('/api/matches/:id/prediction', async (req, reply) => {
    const body = z
      .object({ pick: z.enum(['A', 'B']), how: z.enum(['TWO_SETS', 'SUPER_TIEBREAK']).nullable() })
      .parse(req.body);
    const playerId = req.user!.playerId;
    const m = await fullMatch(req.params.id);
    if (!m) return reply.code(404).send({ error: 'Partita non trovata' });
    if (!playerId || !(await db.seasonPlayer.findUnique({ where: { seasonId_playerId: { seasonId: m.seasonId, playerId } } }))) {
      return reply.code(403).send({ error: 'Pronosticano solo i giocatori del torneo' });
    }
    if (playerId === m.playerAId || playerId === m.playerBId) {
      return reply.code(403).send({ error: 'Non puoi pronosticare le tue partite' });
    }
    if (m.season.status !== 'ACTIVE' || !predictionsOpen({ scheduledAt: m.scheduledAt, hasResult: m.result !== null })) {
      return reply.code(409).send({ error: 'I pronostici per questa partita sono chiusi' });
    }
    await db.prediction.upsert({
      where: { matchId_playerId: { matchId: m.id, playerId } },
      create: { matchId: m.id, playerId, ...body },
      update: body,
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/matches/:id/postpone', async (req, reply) => {
    const m = await loadForAction(req.params.id, req.user!, reply);
    if (!m) return;
    if (m.result) return reply.code(409).send({ error: 'La partita è già stata giocata' });
    await db.match.update({ where: { id: m.id }, data: { postponedAt: new Date(), scheduledAt: null } });
    await audit(req.user!.id, 'Match', m.id, 'postpone', { scheduledAt: m.scheduledAt });
    return { ok: true };
  });

  app.put<{ Params: { id: string } }>('/api/matches/:id/result', async (req, reply) => {
    const input: MatchScoreInput = resultBody.parse(req.body);
    const user = req.user!;
    const m = await fullMatch(req.params.id);
    if (!m) return reply.code(404).send({ error: 'Partita non trovata' });
    // Dall'app inseriscono solo i due giocatori; l'admin corregge dal gestionale
    if (!isPlayerOf(user, m)) return reply.code(403).send({ error: 'Puoi inserire solo il risultato delle tue partite' });
    if (m.season.status !== 'ACTIVE') return reply.code(409).send({ error: 'Il torneo non è in corso' });
    if (m.result?.status === 'CONFIRMED') {
      return reply.code(409).send({ error: 'Il risultato è già confermato: per correggerlo serve un amministratore' });
    }
    if (m.result?.status === 'DISPUTED') {
      return reply.code(409).send({ error: 'Il risultato è contestato: decide un amministratore' });
    }

    const ev = evaluateMatch(input);
    if (ev.status !== 'OK') return reply.code(400).send({ error: ev.message });

    const data = resultRecord(input, user.id, m.season.resultAutoConfirmDays);
    await db.matchResult.upsert({ where: { matchId: m.id }, create: { matchId: m.id, ...data }, update: data });
    await audit(user.id, 'MatchResult', m.id, m.result ? 'update' : 'create', m.result, data);

    // L'avversario di chi inserisce riceve il risultato da confermare
    const opponent = user.playerId === m.playerAId ? m.playerB : m.playerA;
    if (opponent.user) {
      await sendMail({
        to: opponent.user.email,
        subject: `Conferma il risultato: ${matchTitle(m)} ${formatScore(input)}`,
        text: `È stato inserito il risultato di ${matchTitle(m)}: ${formatScore(input)}${input.timeExpired ? ' (tempo scaduto)' : ''}.\nPunti: ${m.playerA.shortName} ${ev.pointsA}, ${m.playerB.shortName} ${ev.pointsB}.\n\nConfermalo o contestalo qui (senza risposta si conferma da solo tra ${m.season.resultAutoConfirmDays} giorni):\n${env.appUrl}/partite/${m.id}/conferma`,
      });
    }
    return { ok: true, status: data.status };
  });

  const opponentAction = async (id: string, user: CurrentUser, reply: FastifyReply) => {
    const m = await fullMatch(id);
    if (!m?.result) {
      reply.code(404).send({ error: 'Nessun risultato da confermare' });
      return null;
    }
    if (m.result.status !== 'PENDING' || m.season.status !== 'ACTIVE') {
      reply.code(409).send({ error: 'Il risultato non è più in attesa di conferma' });
      return null;
    }
    // Conferma/contesta solo l'avversario di chi ha inserito
    const submitter = m.result.submittedBy?.player?.id ?? null;
    if (!isPlayerOf(user, m) || user.playerId === submitter) {
      reply.code(403).send({ error: "Può rispondere solo l'avversario di chi ha inserito il risultato" });
      return null;
    }
    return m;
  };

  app.post<{ Params: { id: string } }>('/api/matches/:id/result/confirm', async (req, reply) => {
    const m = await opponentAction(req.params.id, req.user!, reply);
    if (!m) return;
    await db.matchResult.update({
      where: { matchId: m.id },
      data: { status: 'CONFIRMED', confirmedById: req.user!.id, confirmedAt: new Date() },
    });
    await audit(req.user!.id, 'MatchResult', m.id, 'confirm');
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/matches/:id/result/dispute', async (req, reply) => {
    const { note } = z.object({ note: z.string().trim().min(3).max(1000) }).parse(req.body);
    const m = await opponentAction(req.params.id, req.user!, reply);
    if (!m) return;
    await db.matchResult.update({
      where: { matchId: m.id },
      data: { status: 'DISPUTED', disputeNote: note, disputedAt: new Date() },
    });
    await audit(req.user!.id, 'MatchResult', m.id, 'dispute', null, { note });
    const admins = await db.user.findMany({ where: { isAdmin: true } });
    for (const a of admins) {
      await sendMail({
        to: a.email,
        subject: `Risultato contestato: ${matchTitle(m)}`,
        text: `Il risultato ${formatScore(scoreInput(m.result!))} di ${matchTitle(m)} è stato contestato.\n\nNota: "${note}"\n\nDecidi qui:\n${env.appUrl}/admin`,
      });
    }
    return { ok: true };
  });
}
