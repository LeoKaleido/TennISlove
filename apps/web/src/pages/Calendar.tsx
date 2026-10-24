import { useState } from 'react';
import { MatchRow } from '../components/MatchRow';
import { ErrorState, Loading } from '../components/ui';
import { currentRound, isMine, roundRange, today, useMe, useSeason } from '../data';

export function CalendarPage() {
  const me = useMe();
  const season = useSeason();
  const [mineOnly, setMineOnly] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});

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
          {rounds.length} giornate, {data.matches.filter((m) => m.phase === 'ROUND_ROBIN').length} partite. Giorno, ora e circolo li decidete voi.
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
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                  <span className="faint" style={{ width: 22, textAlign: 'center', fontSize: 18 }}>
                    {expanded ? '−' : '+'}
                  </span>
                </button>
                {expanded && (
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
                )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', color: 'var(--ink2)' }}>
          <span style={{ flex: 1, borderTop: '1.5px solid var(--line2)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Poi: fase finale, top {data.season.qualifiers}
          </span>
          <span style={{ flex: 1, borderTop: '1.5px solid var(--line2)' }} />
        </div>
      </div>
    </div>
  );
}
