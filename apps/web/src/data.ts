// Query condivise e piccole funzioni di presentazione.

import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import {
  COUNTS_IN_STANDINGS,
  formatDayWithWeekday,
  formatRange,
  formatScore,
  romeDay,
  romeTime,
  standingsTimeline,
  type MatchStatus,
  type Zone,
} from '@tentennis/shared';
import { api, ApiError, type Match, type Me, type Player, type Round, type SeasonOverview } from './api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<Me>('/api/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

// Torneo scelto (D-068): vale per tutta l'app, ricordato sul dispositivo. Nessuna scelta = quello in corso
const SEASON_KEY = 'tennislove:season';
const seasonListeners = new Set<() => void>();

function readSelectedSeason(): string | null {
  try {
    return localStorage.getItem(SEASON_KEY);
  } catch {
    return null;
  }
}

export function selectSeason(id: string | null) {
  try {
    if (id) localStorage.setItem(SEASON_KEY, id);
    else localStorage.removeItem(SEASON_KEY);
  } catch {
    // storage non disponibile: la scelta vale solo finché la pagina resta aperta
  }
  seasonListeners.forEach((l) => l());
}

const subscribeSeason = (l: () => void) => {
  seasonListeners.add(l);
  return () => {
    seasonListeners.delete(l);
  };
};

/** Il torneo scelto, se esiste ancora e non è quello in corso; altrimenti undefined (= in corso) */
export function useSelectedSeasonId() {
  const selected = useSyncExternalStore(subscribeSeason, readSelectedSeason);
  const seasons = useSeasons();
  if (!selected) return undefined;
  if (!seasons.data) return selected;
  return seasons.data.some((s) => s.id === selected && s.status !== 'ACTIVE') ? selected : undefined;
}

/** Un torneo: quello indicato, altrimenti quello scelto, altrimenti quello in corso */
export function useSeason(id?: string) {
  const selected = useSelectedSeasonId();
  return useSeasonData(id ?? selected);
}

/** Sempre il torneo in corso: per le azioni sulle partite (risultato, conferma, foto) e il gestionale */
export const useCurrentSeason = () => useSeasonData(undefined);

function useSeasonData(id: string | undefined) {
  return useQuery({
    queryKey: ['season', id ?? 'current'],
    queryFn: () => api<SeasonOverview>(id ? `/api/season?id=${id}` : '/api/season'),
    staleTime: 30_000,
  });
}

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<{ id: string; name: string; label: string; status: string }[]>('/api/seasons'),
  });
}

export const today = () => romeDay(new Date());

/** Giornata in corso: quella che contiene oggi, altrimenti la prossima, altrimenti l'ultima */
export function currentRound(rounds: Round[], day = today()): Round | undefined {
  const rr = rounds.filter((r) => r.phase === 'ROUND_ROBIN');
  return rr.find((r) => r.startsOn <= day && day <= r.endsOn) ?? rr.find((r) => r.startsOn > day) ?? rr[rr.length - 1];
}

export const playerIndex = (players: Player[]) => new Map(players.map((p) => [p.id, p]));

export const fullName = (p: Player) => `${p.firstName} ${p.lastName}`;

export const roundRange = (r: Pick<Round, 'startsOn' | 'endsOn'>) => formatRange(r.startsOn, r.endsOn);

export const isMine = (m: Match, playerId: string | null | undefined) =>
  !!playerId && (m.playerAId === playerId || m.playerBId === playerId);

export const opponentOf = (m: Match, playerId: string) => (m.playerAId === playerId ? m.playerBId : m.playerAId);

/** Riga descrittiva della partita, come nel mockup */
export function matchInfo(m: Match, rounds: Round[], clubName: (id: string | null) => string | undefined): string {
  const round = rounds.find((r) => r.number === m.round && r.phase === m.phase);
  const when = m.scheduledAt ? `${formatDayWithWeekday(romeDay(m.scheduledAt))}, ${romeTime(m.scheduledAt)}` : null;
  switch (m.status) {
    case 'PROVISIONAL':
    case 'CONFIRMED':
      return [formatScore(m.result!) + (m.result!.timeExpired ? ', tempo scaduto' : ''), when && formatDayWithWeekday(romeDay(m.scheduledAt!))]
        .filter(Boolean)
        .join(', ');
    case 'DISPUTED':
      return `${formatScore(m.result!)}, in revisione`;
    case 'SCHEDULED':
      return [when, clubName(m.clubId) ?? m.venue].filter(Boolean).join(', ');
    case 'POSTPONED':
      return when ? `Rinviata a ${when}` : 'Rinviata, nuova data da decidere';
    case 'TO_RECOVER':
      return 'Settimana scaduta, da recuperare';
    default:
      return round ? `Da programmare entro ${formatDayWithWeekday(round.endsOn)}` : 'Da programmare';
  }
}

export const STATUS_STYLE: Record<MatchStatus, { label: string; bg: string; fg: string; border: string; text: string }> = {
  TO_SCHEDULE: { label: 'Da programmare', bg: 'transparent', fg: 'var(--ink2)', border: '1px solid var(--line2)', text: 'var(--ink2)' },
  SCHEDULED: { label: 'Programmata', bg: 'var(--mint)', fg: 'var(--mintInk)', border: '1px solid transparent', text: 'var(--accent)' },
  POSTPONED: { label: 'Rinviata', bg: 'var(--warnBg)', fg: 'var(--warnFg)', border: '1px solid transparent', text: 'var(--warnFg)' },
  TO_RECOVER: { label: 'Da recuperare', bg: 'var(--recBg)', fg: 'var(--recFg)', border: '1px solid transparent', text: 'var(--recFg)' },
  PROVISIONAL: { label: 'Provvisoria', bg: 'transparent', fg: 'var(--accent)', border: '1.5px dashed var(--accent)', text: 'var(--accent)' },
  CONFIRMED: { label: 'Confermata', bg: 'var(--accent)', fg: 'var(--onAccent)', border: '1px solid transparent', text: 'var(--ink3)' },
  DISPUTED: { label: 'Contestata', bg: 'var(--errBg)', fg: 'var(--errFg)', border: '1px solid transparent', text: 'var(--errFg)' },
};

export const ZONE_STYLE: Record<Zone, { label: string; bg: string; fg: string; border: string }> = {
  TOP: { label: 'Top 8 provv.', bg: 'var(--mint)', fg: 'var(--mintInk)', border: '1px solid transparent' },
  CUT_TIE: { label: 'Parità al taglio', bg: 'var(--warnBg)', fg: 'var(--warnFg)', border: '1px solid transparent' },
  OUT: { label: 'Fuori Top 8', bg: 'var(--surface2)', fg: 'var(--ink2)', border: '1px solid transparent' },
  TBD: { label: 'Da definire', bg: 'transparent', fg: 'var(--ink2)', border: '1px dashed var(--line2)' },
};

/** Colore dell'avatar, stabile per giocatore */
export function avatarColors(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { bg: `oklch(0.88 0.07 ${h})`, fg: `oklch(0.3 0.08 ${h})` };
}

export const initials = (p: Player) => `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();

/**
 * Giorno in cui si è giocata una partita: quello programmato; altrimenti l'inserimento del risultato,
 * ma non oltre la fine della sua settimana (i risultati importati dall'Excel sono stati inseriti tutti dopo)
 */
export function playedOn(m: Match, rounds: Round[]): string | null {
  if (m.scheduledAt) return romeDay(m.scheduledAt);
  if (!m.result) return null;
  const submitted = romeDay(m.result.submittedAt);
  const endsOn = rounds.find((r) => r.number === m.round && r.phase === m.phase)?.endsOn;
  return endsOn && endsOn < submitted ? endsOn : submitted;
}

/** Classifica a fine di ogni giornata del girone iniziata finora (D-064) */
export function timelineFor(data: SeasonOverview) {
  const matches = data.matches.flatMap((m) => {
    const r = m.result;
    const day = playedOn(m, data.rounds);
    return m.phase === 'ROUND_ROBIN' && r && day && COUNTS_IN_STANDINGS.includes(r.status)
      ? [{ playerAId: m.playerAId, playerBId: m.playerBId, score: r, playedOn: day }]
      : [];
  });
  return standingsTimeline(
    data.players.map((p) => p.id),
    matches,
    data.rounds.filter((r) => r.phase === 'ROUND_ROBIN'),
    today(),
    data.season.qualifiers,
  );
}
