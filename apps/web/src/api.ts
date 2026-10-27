// Client dell'API e tipi delle risposte.

import type { MatchScoreInput, MatchStatus, PredictionHow, PredictionStandingRow, ResultStatus, Side, StandingRow } from '@tentennis/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Qualcosa è andato storto');
  return data as T;
}

export interface Me {
  id: string;
  email: string;
  isAdmin: boolean;
  playerId: string | null;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  photoUrl: string | null;
}

export interface Club {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  mapsUrl: string | null;
}

export interface Round {
  number: number;
  phase: 'ROUND_ROBIN' | 'KNOCKOUT';
  startsOn: string;
  endsOn: string;
  pauseAfter: string | null;
}

export interface MatchResult extends MatchScoreInput {
  status: ResultStatus;
  submittedByPlayerId: string | null;
  submittedAt: string;
  autoConfirmAt: string | null;
  confirmedAutomatically: boolean;
  disputeNote: string | null;
  winner: 'A' | 'B' | null;
  how: 'TWO_SETS' | 'SUPER_TIEBREAK' | 'TIME_EXPIRED' | null;
  pointsA: number;
  pointsB: number;
  gamesA: number;
  gamesB: number;
  compensationA: number;
  compensationB: number;
}

export interface Match {
  id: string;
  code: string;
  round: number;
  phase: Round['phase'];
  playerAId: string;
  playerBId: string;
  scheduledAt: string | null;
  clubId: string | null;
  /** campo fuori lista, scritto a mano */
  venue: string | null;
  postponed: boolean;
  status: MatchStatus;
  coverPhotoUrl: string | null;
  photoCount: number;
  result: MatchResult | null;
}

/** Pronostici di una partita, già filtrati per chi guarda (D-061) */
export interface MatchPredictions {
  open: boolean;
  canPredict: boolean;
  count: number;
  mine: { pick: Side; how: PredictionHow | null } | null;
  /** dopo aver votato o a pronostici chiusi */
  split: { A: number; B: number } | null;
  /** a pronostici chiusi; `points` solo con un risultato che conta */
  voters: { playerId: string; pick: Side; how: PredictionHow | null; points: number | null; upset: boolean }[] | null;
}

export interface SeasonOverview {
  season: {
    id: string;
    name: string;
    label: string;
    subtitle: string | null;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    qualifiers: number;
    resultAutoConfirmDays: number;
    championPlayerId: string | null;
  };
  players: Player[];
  rounds: Round[];
  matches: (Match & { predictions: MatchPredictions })[];
  clubs: Club[];
  standings: StandingRow[];
  predictionStandings: PredictionStandingRow[];
  provisionalCount: number;
}

export interface MatchDetail {
  match: Match;
  club: Pick<Club, 'id' | 'name' | 'city' | 'mapsUrl'> | null;
  round: Pick<Round, 'number' | 'startsOn' | 'endsOn'>;
  photos: { id: string; url: string; uploadedById: string }[];
  googleCalendarUrl: string | null;
}
