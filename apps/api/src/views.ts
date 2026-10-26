// Serializzazione verso il frontend: partite con stato derivato e punti calcolati.

import type { Club, Match, MatchPhoto, MatchResult, Player, Round, Season } from '@prisma/client';
import {
  computeStandings,
  COUNTS_IN_STANDINGS,
  evaluateMatch,
  matchStatus,
  type MatchScoreInput,
} from '@tentennis/shared';
import { db } from './db';

export type MatchRow = Match & { round: Round; result: MatchResult | null; _count: { photos: number } };

export function scoreInput(r: MatchResult): MatchScoreInput {
  const pair = (a: number | null, b: number | null) => (a === null || b === null ? null : { a, b });
  return {
    timeExpired: r.timeExpired,
    set1: pair(r.set1A, r.set1B),
    set2: pair(r.set2A, r.set2B),
    stb: pair(r.stbA, r.stbB),
  };
}

export const photoUrl = (p: Pick<MatchPhoto, 'id'>) => `/api/photos/${p.id}`;

export function matchView(m: MatchRow, submittedByPlayerId: string | null = null) {
  const r = m.result;
  const score = r ? scoreInput(r) : null;
  const ev = score ? evaluateMatch(score) : null;
  return {
    id: m.id,
    code: m.code,
    round: m.round.number,
    phase: m.round.phase,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    clubId: m.clubId,
    venue: m.venue,
    postponed: m.postponedAt !== null,
    status: matchStatus({
      resultStatus: r?.status ?? null,
      scheduledAt: m.scheduledAt,
      postponed: m.postponedAt !== null,
      roundEndsOn: m.round.endsOn,
    }),
    coverPhotoUrl: m.coverPhotoId ? photoUrl({ id: m.coverPhotoId }) : null,
    photoCount: m._count.photos,
    result:
      r && score && ev
        ? {
            ...score,
            status: r.status,
            submittedByPlayerId,
            submittedAt: r.submittedAt.toISOString(),
            autoConfirmAt: r.autoConfirmAt?.toISOString() ?? null,
            confirmedAutomatically: r.confirmedAutomatically,
            disputeNote: r.disputeNote,
            winner: ev.winner,
            how: ev.how,
            pointsA: ev.pointsA,
            pointsB: ev.pointsB,
            gamesA: ev.gamesA,
            gamesB: ev.gamesB,
            compensationA: ev.compensationA,
            compensationB: ev.compensationB,
          }
        : null,
  };
}

export type MatchView = ReturnType<typeof matchView>;

export const matchInclude = {
  round: true,
  result: { include: { submittedBy: { include: { player: true } } } },
  _count: { select: { photos: true } },
} as const;

type FullMatch = MatchRow & { result: (MatchResult & { submittedBy: { player: Player | null } | null }) | null };

export const toView = (m: FullMatch) => matchView(m, m.result?.submittedBy?.player?.id ?? null);

/** Tutto quello che serve all'app per una stagione, in una sola risposta (66 partite: pochi KB) */
export async function seasonOverview(season: Season) {
  const [players, rounds, matches, clubs] = await Promise.all([
    db.seasonPlayer.findMany({
      where: { seasonId: season.id },
      include: { player: { include: { user: true } } },
      orderBy: { seedOrder: 'asc' },
    }),
    db.round.findMany({ where: { seasonId: season.id }, orderBy: [{ phase: 'asc' }, { number: 'asc' }] }),
    db.match.findMany({ where: { seasonId: season.id }, include: matchInclude, orderBy: { code: 'asc' } }),
    db.seasonClub.findMany({ where: { seasonId: season.id, club: { active: true } }, include: { club: true }, orderBy: { club: { name: 'asc' } } }),
  ]);

  const views = matches.map(toView);
  const standings = computeStandings(
    players.map((p) => p.playerId),
    matches
      .filter((m) => m.round.phase === 'ROUND_ROBIN' && m.result && COUNTS_IN_STANDINGS.includes(m.result.status))
      .map((m) => ({ playerAId: m.playerAId, playerBId: m.playerBId, score: scoreInput(m.result!) })),
    { qualifiers: season.qualifiers },
  );

  return {
    season: {
      id: season.id,
      name: season.name,
      label: season.label,
      subtitle: season.subtitle,
      status: season.status,
      qualifiers: season.qualifiers,
      resultAutoConfirmDays: season.resultAutoConfirmDays,
      championPlayerId: season.championPlayerId,
    },
    players: players.map(({ player: p }) => playerView(p)),
    rounds: rounds.map((r) => ({
      number: r.number,
      phase: r.phase,
      startsOn: r.startsOn,
      endsOn: r.endsOn,
      pauseAfter: r.pauseAfter,
    })),
    matches: views,
    clubs: clubs.map(({ club }) => clubView(club)),
    standings,
    provisionalCount: views.filter((m) => m.result?.status === 'PENDING').length,
  };
}

export function playerView(p: Player) {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    shortName: p.shortName,
    // la versione nell'URL evita che il browser mostri la foto precedente dalla cache
    photoUrl: p.photoKey ? `/api/players/${p.id}/photo?v=${encodeURIComponent(p.photoKey)}` : null,
  };
}

export function clubView(c: Club) {
  return { id: c.id, name: c.name, city: c.city, description: c.description, mapsUrl: c.mapsUrl };
}
