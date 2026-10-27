// Badge nel profilo (D-062): quali sono stati ottenuti, in quali tornei, quanto manca agli altri.

import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { BADGE_ORDER, BADGES, ONCE_PER_SEASON, type BadgeId, type BadgeState } from '@tentennis/shared';
import { api, type SeasonOverview } from '../api';
import { badgesFor, badgeSvg } from '../badges';
import { opponentOf, playerIndex, useSeasons } from '../data';
import { Collapse } from './ui';

/** Medaglia del badge; dal secondo livello in su, il numero in un tondino */
export function BadgeIcon({ id, size = 56, locked = false, level = 0 }: { id: BadgeId; size?: number; locked?: boolean; level?: number }) {
  return (
    <span className="badge-wrap" style={{ width: size, height: size }}>
      <span
        className={`badge-icon${locked ? ' locked' : ''}`}
        style={{ width: size, height: size }}
        aria-hidden
        // SVG scritto da noi (badges.ts), nessun dato dell'utente
        dangerouslySetInnerHTML={{ __html: badgeSvg(id, size) }}
      />
      {level > 1 && (
        <span className="badge-level" aria-label={`livello ${level}`} style={{ fontSize: Math.max(11, Math.round(size * 0.21)) }}>
          ×{level}
        </span>
      )}
    </span>
  );
}

/** Livello totale: quante volte è stato ottenuto, sommando i tornei */
export const badgeLevel = (list: { badges: BadgeState[] }[], id: BadgeId) => list.reduce((n, s) => n + s.badges.find((b) => b.id === id)!.times, 0);

/** Cosa manca per ottenere un badge, dato quanto manca all'obiettivo */
function missing(id: BadgeId, n: number): string {
  const many = n > 1;
  switch (id) {
    case 'FIRST_WIN':
      return 'una vittoria';
    case 'BAGEL':
      return 'un set vinto 6-0';
    case 'COMEBACK':
      return 'una vittoria dopo aver perso il primo set';
    case 'WALL':
      return 'una vittoria concedendo al massimo 3 game';
    case 'STREAK':
      return many ? `${n} vittorie di fila` : 'ancora una vittoria di fila';
    case 'TIEBREAK_KING':
      return many ? `${n} vittorie al super tie break` : 'ancora una vittoria al super tie break';
    case 'GIANT_KILLER':
      return 'battere chi è primo in classifica';
    case 'PHOTOGRAPHER':
      return many ? `foto in altre ${n} partite` : 'foto in un’altra partita';
    case 'SEER':
      return many ? `altri ${n} pronostici giusti` : 'un altro pronostico giusto';
    case 'UPSET':
      return 'indovinare uno sfavorito nei pronostici';
    case 'CHAMPION':
      return 'vincere il torneo';
    case 'ORACLE':
      return 'chiudere la stagione primo nei pronostici';
    case 'PODIUM':
      return 'chiudere la stagione tra i primi 3';
  }
}

interface SeasonBadges {
  data: SeasonOverview;
  badges: BadgeState[];
}

/** Badge del giocatore in tutte le stagioni a cui ha partecipato */
export function useBadgesAcrossSeasons(playerId: string) {
  const seasons = useSeasons();
  const results = useQueries({
    queries: (seasons.data ?? []).map((s) => ({
      queryKey: ['season', s.status === 'ACTIVE' ? 'current' : s.id],
      queryFn: () => api<SeasonOverview>(s.status === 'ACTIVE' ? '/api/season' : `/api/season?id=${s.id}`),
      staleTime: 30_000,
    })),
  });
  const list: SeasonBadges[] = results
    .map((r) => r.data)
    .filter((d): d is SeasonOverview => !!d && d.players.some((p) => p.id === playerId))
    .map((data) => ({ data, badges: badgesFor(data, playerId) }));
  return { list, loading: seasons.isLoading || results.some((r) => r.isLoading) };
}

export function BadgeSection({ playerId }: { playerId: string }) {
  const { list, loading } = useBadgesAcrossSeasons(playerId);
  const [selected, setSelected] = useState<BadgeId | null>(null);
  if (loading || list.length === 0) return null;

  // la stagione in corso decide l'avanzamento di quelli ancora da ottenere
  const current = list.find((s) => s.data.season.status === 'ACTIVE') ?? list[0]!;
  const earnedIn = (id: BadgeId) => list.filter((s) => s.badges.find((b) => b.id === id)!.earned);
  const total = BADGE_ORDER.filter((id) => earnedIn(id).length > 0).length;

  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-head">
        <h2 className="title">Badge</h2>
        <span className="faint" style={{ fontSize: 12.5 }}>
          {total} su {BADGE_ORDER.length}
        </span>
      </div>
      <div className="card" style={{ padding: 12 }}>
        <div className="badge-grid">
          {BADGE_ORDER.map((id) => {
            const seasons = earnedIn(id);
            const state = current.badges.find((b) => b.id === id)!;
            const lvl = badgeLevel(list, id);
            const sub =
              seasons.length > 0
                ? seasons.map((s) => s.data.season.label).join(', ')
                : state.target > 1 && state.progress > 0
                  ? `${state.progress}/${state.target}`
                  : 'Da sbloccare';
            return (
              <button key={id} className="badge-tile" aria-pressed={selected === id} onClick={() => setSelected(selected === id ? null : id)}>
                <BadgeIcon id={id} locked={seasons.length === 0} level={lvl} />
                <span className="badge-name">{BADGES[id].name}</span>
                <span className="badge-sub">{sub}</span>
              </button>
            );
          })}
        </div>
        <Collapse open={selected !== null}>
          {selected && <BadgeDetail id={selected} list={list} current={current} playerId={playerId} />}
        </Collapse>
      </div>
    </div>
  );
}

function BadgeDetail({ id, list, current, playerId }: { id: BadgeId; list: SeasonBadges[]; current: SeasonBadges; playerId: string }) {
  const state = current.badges.find((b) => b.id === id)!;
  const earned = list.flatMap((s) => {
    const b = s.badges.find((x) => x.id === id)!;
    return b.earned ? [{ s, b }] : [];
  });
  const level = badgeLevel(list, id);
  const seasonEnd = id === 'CHAMPION' || id === 'ORACLE' || id === 'PODIUM';
  // un badge da una volta a stagione, già preso in questo torneo, non ha un livello da raggiungere qui
  const nextHere = current.data.season.status === 'ACTIVE' && !(ONCE_PER_SEASON.includes(id) && state.earned);
  return (
    <div className="badge-detail">
      <BadgeIcon id={id} size={64} locked={earned.length === 0} level={level} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>
          {BADGES[id].name}
          {level > 0 && <span className="faint" style={{ fontWeight: 700 }}>{` · livello ${level}`}</span>}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {BADGES[id].rule}
        </span>
        {earned.map(({ s, b }) => {
          const players = playerIndex(s.data.players);
          const matches = b.matchIds.flatMap((mid) => s.data.matches.filter((x) => x.id === mid));
          return (
            <span key={s.data.season.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
              <strong>
                Torneo {s.data.season.label}
                {b.times > 1 ? `, ${b.times} volte` : ''}
              </strong>
              {matches.length > 0 && ': '}
              {matches.map((m, i) => (
                <span key={`${m.id}-${i}`}>
                  {i > 0 && ', '}
                  <Link to={`/partite/${m.id}`}>
                    giornata {m.round} contro {players.get(opponentOf(m, playerId))?.shortName}
                  </Link>
                </span>
              ))}
            </span>
          );
        })}
        {nextHere && (
          <>
            {state.target > 1 && (
              <div className="badge-progress" aria-label={`${state.progress} su ${state.target}`}>
                <span style={{ width: `${(state.progress / state.target) * 100}%` }} />
              </div>
            )}
            <span style={{ fontSize: 13 }}>
              {level > 0 ? 'Per il prossimo livello' : 'Per sbloccarlo'}: {missing(id, state.target - state.progress)}
              {seasonEnd && ' (si assegna a stagione chiusa)'}.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
