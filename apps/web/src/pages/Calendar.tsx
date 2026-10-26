import { useState } from 'react';
import { MatchRow } from '../components/MatchRow';
import { Chevron, Collapse, ErrorState, Loading, useDesktop } from '../components/ui';
import type { Match, Round, SeasonOverview } from '../api';
import { currentRound, isMine, roundRange, today, useMe, useSeason } from '../data';

export function CalendarPage() {
  const me = useMe();
  const season = useSeason();
  const [mineOnly, setMineOnly] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const desktop = useDesktop();

  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const myId = me.data?.playerId;
  const current = currentRound(data.rounds);
  const day = today();
  const rounds = data.rounds.filter((r) => r.phase === 'ROUND_ROBIN');
  const isOpen = (n: number) => open[n] ?? n === current?.number;

  return (
    <div className="screen" style={{ gap: 14 }}>
      <div className="page-head">
        <h1 className="display">Calendario</h1>
        <div className="sub">
          {rounds.length} giornate, {data.matches.filter((m) => m.phase === 'ROUND_ROBIN').length} partite
        </div>
      </div>
      {myId && (
        <div className="pad">
          <div className="segmented">
            <button aria-pressed={!mineOnly} onClick={() => setMineOnly(false)}>
              Tutte
            </button>
            <button aria-pressed={mineOnly} onClick={() => setMineOnly(true)}>
              Le mie
            </button>
          </div>
        </div>
      )}
      {desktop ? (
        <DesktopRounds
          data={data}
          rounds={rounds}
          selected={selected ?? current?.number ?? rounds[0]?.number}
          onSelect={setSelected}
          matchesOf={(r) => data.matches.filter((m) => m.round === r.number && m.phase === r.phase && (!mineOnly || isMine(m, myId)))}
          myId={myId}
        />
      ) : (
      <div className="cal-rounds" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rounds.map((r) => {
          const matches = data.matches.filter((m) => m.round === r.number && m.phase === r.phase && (!mineOnly || isMine(m, myId)));
          const done = data.matches.filter((m) => m.round === r.number && m.phase === r.phase && m.result).length;
          const all = data.matches.filter((m) => m.round === r.number && m.phase === r.phase).length;
          const isCurrent = r.number === current?.number;
          const past = r.endsOn < day;
          const expanded = isOpen(r.number);
          return (
            <div key={r.number}>
              <div className="card" style={{ border: isCurrent ? '2px solid var(--accent)' : undefined }}>
                <button className="list-row" onClick={() => setOpen({ ...open, [r.number]: !expanded })}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: isCurrent ? 'var(--accent)' : past ? 'var(--night)' : 'var(--surface2)',
                      color: isCurrent ? 'var(--onAccent)' : past ? '#C6EEDB' : 'var(--ink)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 900,
                      fontStretch: '70%',
                      fontSize: 20,
                      flex: 'none',
                    }}
                  >
                    {r.number}
                  </span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="title" style={{ fontSize: 17, fontStretch: '80%' }}>
                      Giornata {r.number}
                    </span>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {roundRange(r)}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? 'var(--accent)' : 'var(--ink3)' }}>
                    {isCurrent ? 'In corso' : `${done}/${all} giocate`}
                  </span>
                  <Chevron open={expanded} />
                </button>
                <Collapse open={expanded}>
                  <div style={{ borderTop: '1px solid var(--line)' }}>
                    {matches.length === 0 && (
                      <div className="faint" style={{ padding: '12px 14px', fontSize: 13 }}>
                        Nessuna tua partita in questa giornata.
                      </div>
                    )}
                    {matches.map((m) => (
                      <MatchRow key={m.id} match={m} data={data} highlight={isMine(m, myId)} />
                    ))}
                  </div>
                </Collapse>
              </div>
              {r.pauseAfter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 4px', color: 'var(--ink2)' }}>
                  <span style={{ flex: 1, borderTop: '1.5px dashed var(--line2)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{r.pauseAfter}</span>
                  <span style={{ flex: 1, borderTop: '1.5px dashed var(--line2)' }} />
                </div>
              )}
            </div>
          );
        })}
        {data.season.qualifiers > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', color: 'var(--ink2)' }}>
            <span style={{ flex: 1, borderTop: '1.5px solid var(--line2)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Poi: fase finale, top {data.season.qualifiers}
            </span>
            <span style={{ flex: 1, borderTop: '1.5px solid var(--line2)' }} />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/**
 * Desktop: elenco compatto delle giornate a sinistra, partite della giornata scelta a destra.
 * Niente accordion: su due colonne le giornate aperte lascerebbero buchi.
 */
function DesktopRounds({
  data,
  rounds,
  selected,
  onSelect,
  matchesOf,
  myId,
}: {
  data: SeasonOverview;
  rounds: Round[];
  selected: number | undefined;
  onSelect: (n: number) => void;
  matchesOf: (r: Round) => Match[];
  myId: string | null | undefined;
}) {
  const current = currentRound(data.rounds);
  const day = today();
  const round = rounds.find((r) => r.number === selected) ?? rounds[0];
  const matches = round ? matchesOf(round) : [];
  const played = (r: Round) => data.matches.filter((m) => m.round === r.number && m.phase === r.phase && m.result).length;
  const total = (r: Round) => data.matches.filter((m) => m.round === r.number && m.phase === r.phase).length;

  return (
    <div className="cal-desktop">
      <nav className="card cal-list" aria-label="Giornate">
        {rounds.map((r) => {
          const isCurrent = r.number === current?.number;
          const on = r.number === round?.number;
          return (
            <div key={r.number}>
              <button className="list-row" aria-current={on} onClick={() => onSelect(r.number)}>
                <span className={`cal-num${isCurrent ? ' current' : r.endsOn < day ? ' past' : ''}`}>{r.number}</span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5 }}>Giornata {r.number}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {roundRange(r)}
                  </span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? 'var(--accent)' : 'var(--ink3)' }}>
                  {isCurrent ? 'In corso' : `${played(r)}/${total(r)}`}
                </span>
              </button>
              {r.pauseAfter && <div className="cal-pause">{r.pauseAfter}</div>}
            </div>
          );
        })}
      </nav>
      {round && (
        <section key={round.number} className="card cal-detail" aria-live="polite">
          <div className="cal-detail-head">
            <span className="title" style={{ fontSize: 24 }}>
              Giornata {round.number}
            </span>
            <span className="muted" style={{ fontSize: 13 }}>
              {roundRange(round)}, {played(round)}/{total(round)} giocate
            </span>
          </div>
          {matches.length === 0 ? (
            <div className="faint" style={{ padding: '14px 18px', fontSize: 13 }}>
              Nessuna tua partita in questa giornata.
            </div>
          ) : (
            matches.map((m) => <MatchRow key={m.id} match={m} data={data} highlight={isMine(m, myId)} />)
          )}
        </section>
      )}
    </div>
  );
}
