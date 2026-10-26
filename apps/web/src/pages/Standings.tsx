import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar, Chevron, Collapse, ErrorState, Loading, ZonePill } from '../components/ui';
import { playerIndex, useMe, useSeason, useSeasons } from '../data';

const COLUMNS = [
  { key: 'played', title: 'Giocate' },
  { key: 'won', title: 'Vinte' },
  { key: 'lost', title: 'Perse' },
  { key: 'noResult', title: 'Senza esito' },
  { key: 'gamesWon', title: 'Game fatti' },
  { key: 'gamesLost', title: 'Game subiti' },
  { key: 'gamesDiff', title: 'Differenza game' },
  { key: 'bonus', title: 'Bonus e compensazioni' },
] as const;

export function StandingsPage() {
  const me = useMe();
  const seasons = useSeasons();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const season = useSeason(seasonId);

  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const players = playerIndex(data.players);
  const played = data.matches.filter((m) => m.phase === 'ROUND_ROBIN' && m.result && m.result.status !== 'DISPUTED').length;
  const total = data.matches.filter((m) => m.phase === 'ROUND_ROBIN').length;
  const myId = me.data?.playerId;
  const archived = data.season.status === 'ARCHIVED';
  const champion = data.season.championPlayerId ? players.get(data.season.championPlayerId) : undefined;
  const q = data.season.qualifiers;

  return (
    <div className="screen" style={{ gap: 16 }}>
      <div className="page-head">
        <h1 className="display">Classifica</h1>
        <div className="sub">
          {played} partite su {total}
          {data.provisionalCount > 0 && `, include ${data.provisionalCount} ${data.provisionalCount === 1 ? 'risultato provvisorio' : 'risultati provvisori'}`}
        </div>
      </div>

      {(seasons.data?.length ?? 0) > 1 && (
        <div style={{ padding: '0 16px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {seasons.data!.map((s) => {
            const on = s.id === data.season.id;
            return (
              <button key={s.id} className="chip" aria-pressed={on} onClick={() => setSeasonId(s.status === 'ACTIVE' ? undefined : s.id)} style={{ flex: 'none', height: 34, borderRadius: 99 }}>
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {archived && champion && (
        <div style={{ margin: '0 16px', padding: '16px 18px', borderRadius: 22, background: 'var(--hero)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="kicker" style={{ color: '#C6EEDB' }}>
            Campione {data.season.label}
          </span>
          <span className="display" style={{ fontSize: 34 }}>
            {champion.firstName} {champion.lastName}
          </span>
        </div>
      )}

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.standings.map((r, i) => {
            const p = players.get(r.playerId)!;
            const open = expanded === r.playerId;
            const next = data.standings[i + 1];
            const showCut = q > 0 && r.position <= q && (!next || next.position > q) && i < data.standings.length - 1;
            return (
              <div key={r.playerId}>
                <div className="card" style={{ borderRadius: 18, background: r.playerId === myId ? 'color-mix(in oklch, var(--mint) 28%, var(--surface))' : undefined }}>
                  <button className="list-row" onClick={() => setExpanded(open ? null : r.playerId)}>
                    <span style={{ width: 24, fontWeight: 900, fontStretch: '70%', fontSize: 24 }}>{r.position}</span>
                    <Avatar player={p} size={36} />
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {p.firstName} {p.lastName}
                      </span>
                      <span>
                        {q > 0 && <ZonePill zone={r.zone} qualifiers={q} />}
                      </span>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 900, fontStretch: '70%', fontSize: 28, lineHeight: 1 }}>{r.points}</span>
                      <span className="faint" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
                        punti
                      </span>
                    </span>
                    <Chevron open={open} />
                  </button>
                  <Collapse open={open}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
                        {COLUMNS.map((c) => (
                          <div key={c.key} style={{ background: 'var(--surface)', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: 17 }}>{r[c.key]}</span>
                            <span className="faint" style={{ fontSize: 10.5, textAlign: 'center' }}>
                              {c.title}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Link to={`/giocatori/${p.id}`} className="btn" style={{ width: '100%', height: 42, borderRadius: 0, borderTop: '1px solid var(--line)', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
                        Apri profilo
                      </Link>
                  </Collapse>
                </div>
                {showCut && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px 2px', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                    <span style={{ flex: 1, borderTop: '2px solid var(--accent)' }} />
                    Linea di taglio
                    <span style={{ flex: 1, borderTop: '2px solid var(--accent)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      <div style={{ margin: '4px 16px 0', padding: 18, borderRadius: 22, background: 'var(--hero)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="title" style={{ fontSize: 22, color: '#C6EEDB' }}>
          Come si fanno i punti
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.4 }}>
          <Rule label="Vittoria in 2 set" value="game + 3" />
          <Rule label="Vittoria al super tie break" value="game + 2 + 1 + comp." />
          <Rule label="Sconfitta o tempo scaduto" value="solo game" />
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,.75)', borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 10 }}>
          Compensazione: se chi vince al super tie break ha fatto meno game, riceve la differenza. Es. 0-6 6-4 10-8: vincitore 13, sconfitto 10. A pari
          punti conta lo scontro diretto; tra tre o più, i punti negli scontri tra loro e poi la differenza game.{q > 0 && ` I primi ${q} vanno alla fase finale.`}
        </div>
      </div>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span>{label}</span>
      <strong style={{ textAlign: 'right' }}>{value}</strong>
    </div>
  );
}
