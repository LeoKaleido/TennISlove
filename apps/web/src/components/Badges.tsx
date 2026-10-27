// Badge nel profilo (D-062): quali sono stati ottenuti, in quali tornei, quanto manca agli altri.

import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { BADGE_ORDER, BADGES, formatDay, membershipYears, ONCE_PER_SEASON, type BadgeId, type BadgeState } from '@tentennis/shared';
import { api, type SeasonOverview } from '../api';
import { badgesFor, badgeSvg } from '../badges';
import { opponentOf, playerIndex, today, useSeasons } from '../data';
import { HelpLink, useClosing } from './ui';

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

/** Livello totale: quante volte è stato ottenuto, sommando i tornei; per Veterano gli anni di iscrizione */
export const badgeLevel = (book: BadgeBook, id: BadgeId) =>
  id === 'VETERAN' ? (book.veteran?.years ?? 0) : book.list.reduce((n, s) => n + s.badges.find((b) => b.id === id)!.times, 0);

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
    case 'PRESENCE':
      return 'partecipare al prossimo torneo';
    case 'VETERAN':
      return 'un altro anno di iscrizione';
  }
}

interface SeasonBadges {
  data: SeasonOverview;
  badges: BadgeState[];
}

/** Badge di un giocatore: per torneo, più quelli di carriera (Veterano) */
export interface BadgeBook {
  list: SeasonBadges[];
  veteran: { since: string; years: number; nextOn: string } | null;
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
    // una stagione una volta sola, anche se due voci dell'elenco portano agli stessi dati
    .filter((d, i, all) => all.findIndex((x) => x.season.id === d.season.id) === i)
    .map((data) => ({ data, badges: badgesFor(data, playerId) }));
  const since = list[0]?.data.players.find((p) => p.id === playerId)?.memberSince;
  const veteran = since ? { since, ...membershipYears(since, today()) } : null;
  return { list, veteran, loading: seasons.isLoading || results.some((r) => r.isLoading) };
}

export function BadgeSection({ playerId }: { playerId: string }) {
  const book = useBadgesAcrossSeasons(playerId);
  const { list, veteran } = book;
  const [selected, setSelected] = useState<BadgeId | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  if (book.loading || list.length === 0) return null;

  // la stagione in corso decide l'avanzamento di quelli ancora da ottenere
  const current = list.find((s) => s.data.season.status === 'ACTIVE') ?? list[0]!;
  const earnedIn = (id: BadgeId) => list.filter((s) => s.badges.find((b) => b.id === id)!.earned);
  const total = BADGE_ORDER.filter((id) => badgeLevel(book, id) > 0).length;

  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-head">
        <h2 className="title with-help">
          Badge <HelpLink to="badge" label="badge" />
        </h2>
        <span className="faint" style={{ fontSize: 12.5 }}>
          {total} su {BADGE_ORDER.length}
        </span>
      </div>
      <div className="card" style={{ padding: 12 }}>
        <div className="badge-grid" ref={gridRef}>
          {BADGE_ORDER.map((id) => {
            const seasons = earnedIn(id);
            const state = current.badges.find((b) => b.id === id)!;
            const lvl = badgeLevel(book, id);
            const sub =
              id === 'VETERAN'
                ? lvl > 0
                  ? `${lvl} ${lvl === 1 ? 'anno' : 'anni'}`
                  : 'Da sbloccare'
                : seasons.length > 0
                  ? seasons.map((s) => s.data.season.label).join(', ')
                  : state.target > 1 && state.progress > 0
                    ? `${state.progress}/${state.target}`
                    : 'Da sbloccare';
            return (
              <button key={id} className="badge-tile" aria-pressed={selected === id} onClick={() => setSelected(selected === id ? null : id)}>
                <BadgeIcon id={id} locked={lvl === 0} level={lvl} />
                <span className="badge-name">{BADGES[id].name}</span>
                <span className="badge-sub">{sub}</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <BadgeSheet key={selected} grid={gridRef} onClose={() => setSelected(null)}>
            <BadgeDetail id={selected} book={book} current={current} playerId={playerId} />
          </BadgeSheet>
        )}
      </div>
    </div>
  );
}

/**
 * Dettaglio del badge: pannello che sale dal basso, senza sfondo scuro (la pagina resta visibile e usabile).
 * Si chiude con la ✕, con Esc, toccando fuori (non sulle medaglie: lì si passa a un altro badge) o lo stesso badge.
 */
function BadgeSheet({ grid, onClose, children }: { grid: RefObject<HTMLDivElement>; onClose: () => void; children: ReactNode }) {
  const [closing, close] = useClosing(onClose, 200);
  const ref = useRef<HTMLDivElement>(null);
  // il badge scelto resta in vista sopra il pannello: la pagina scorre quanto serve (sotto i badge ci sono altre sezioni)
  useEffect(() => {
    const sheet = ref.current?.getBoundingClientRect();
    const tile = grid.current?.querySelector('[aria-pressed="true"]')?.getBoundingClientRect();
    if (!sheet) return;
    if (tile && tile.bottom > sheet.top - 12) {
      requestAnimationFrame(() => window.scrollBy({ top: tile.bottom - sheet.top + 12, behavior: 'smooth' }));
    }
  }, [grid]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !grid.current?.contains(t)) close();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [close, grid]);
  return (
    <div ref={ref} className={`badge-sheet${closing ? ' closing' : ''}`} role="dialog" aria-label="Dettaglio del badge">
      <button type="button" className="badge-sheet-close" aria-label="Chiudi" onClick={close}>
        ✕
      </button>
      {children}
    </div>
  );
}

function BadgeDetail({ id, book, current, playerId }: { id: BadgeId; book: BadgeBook; current: SeasonBadges; playerId: string }) {
  if (id === 'VETERAN') return <VeteranDetail book={book} />;
  const state = current.badges.find((b) => b.id === id)!;
  const earned = book.list.flatMap((s) => {
    const b = s.badges.find((x) => x.id === id)!;
    return b.earned ? [{ s, b }] : [];
  });
  const level = badgeLevel(book, id);
  const seasonEnd = id === 'CHAMPION' || id === 'ORACLE' || id === 'PODIUM';
  // un badge da una volta a stagione, già preso in questo torneo, non ha un livello da raggiungere qui
  const nextHere = current.data.season.status === 'ACTIVE' && !(ONCE_PER_SEASON.includes(id) && state.earned);
  // Presenze: il prossimo livello arriva con il prossimo torneo, anche se in questo c'è già
  const nextTournament = id === 'PRESENCE' && !nextHere;
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
        {nextTournament && <span style={{ fontSize: 13 }}>Per il prossimo livello: {missing(id, 1)}.</span>}
      </div>
    </div>
  );
}

/** Veterano: non dipende dai tornei, ma dalla data di iscrizione */
function VeteranDetail({ book }: { book: BadgeBook }) {
  const v = book.veteran;
  const level = v?.years ?? 0;
  const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  // avanzamento nell'anno di iscrizione in corso: dall'ultimo anniversario (o dall'iscrizione) al prossimo
  const from = v && (v.years > 0 ? `${Number(v.nextOn.slice(0, 4)) - 1}${v.nextOn.slice(4)}` : v.since);
  const progress = v && from ? Math.min(1, days(from, today()) / days(from, v.nextOn)) : 0;
  const left = v ? days(today(), v.nextOn) : 0;
  return (
    <div className="badge-detail">
      <BadgeIcon id="VETERAN" size={64} locked={level === 0} level={level} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>
          {BADGES.VETERAN.name}
          {level > 0 && <span className="faint" style={{ fontWeight: 700 }}>{` · livello ${level}`}</span>}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {BADGES.VETERAN.rule}
        </span>
        {v && (
          <>
            <span style={{ fontSize: 13 }}>
              <strong>Iscritto dal {formatDay(v.since)} {v.since.slice(0, 4)}</strong>
              {level > 0 && `, ${level} ${level === 1 ? 'anno' : 'anni'} di iscrizione`}
            </span>
            <div className="badge-progress" aria-label={`mancano ${left} giorni`}>
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <span style={{ fontSize: 13 }}>
              {level > 0 ? 'Per il prossimo livello' : 'Per sbloccarlo'}: {missing('VETERAN', 1)}, il {formatDay(v.nextOn)} {v.nextOn.slice(0, 4)}
              {left > 0 && ` (tra ${left} ${left === 1 ? 'giorno' : 'giorni'})`}.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
