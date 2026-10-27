import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { SeasonOverview } from '../api';
import { PredictionRules } from '../components/Predictions';
import { RankingDivider, RankingList, RankingRow } from '../components/Ranking';
import { Avatar, ErrorState, Loading, ZonePill } from '../components/ui';
import { playerIndex, useMe, useSeason, useSeasons } from '../data';

const COLUMNS = [
  { key: 'played', label: 'G', title: 'Giocate' },
  { key: 'won', label: 'V', title: 'Vinte' },
  { key: 'lost', label: 'P', title: 'Perse' },
  { key: 'noResult', label: 'SE', title: 'Senza esito' },
  { key: 'gamesWon', label: 'GF', title: 'Game fatti' },
  { key: 'gamesLost', label: 'GS', title: 'Game subiti' },
  { key: 'gamesDiff', label: 'DG', title: 'Differenza game' },
  { key: 'bonus', label: 'B', title: 'Bonus e compensazioni' },
] as const;

export function StandingsPage() {
  const me = useMe();
  const seasons = useSeasons();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const season = useSeason(seasonId);
  // classifica del torneo o dei pronostici (D-061), nell'URL così il link dalla Home apre quella giusta
  const [params, setParams] = useSearchParams();
  const predictionsView = params.get('vista') === 'pronostici';
  const setView = (pred: boolean) => setParams(pred ? { vista: 'pronostici' } : {}, { replace: true });

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
    <div className="screen standings" style={{ gap: 16 }}>
      <div className="page-head">
        <h1 className="display">Classifica</h1>
        <div className="sub">
          {played} partite su {total}
          {data.provisionalCount > 0 && `, include ${data.provisionalCount} ${data.provisionalCount === 1 ? 'risultato provvisorio' : 'risultati provvisori'}`}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', gap: 6 }}>
        <button className="chip" aria-pressed={!predictionsView} onClick={() => setView(false)} style={{ height: 34, borderRadius: 99 }}>
          Torneo
        </button>
        <button className="chip" aria-pressed={predictionsView} onClick={() => setView(true)} style={{ height: 34, borderRadius: 99 }}>
          Pronostici
        </button>
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

      {predictionsView ? (
        <PredictionBoard data={data} myId={myId} />
      ) : (
        <>
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

        {/* tabella se c'è spazio, altrimenti schede (decide la larghezza disponibile, non il dispositivo) */}
        <div className="st-board">
          <div className="st-table">
            <div className="card">
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead>
                  <tr style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    <th style={{ textAlign: 'left', padding: '14px 10px 14px 18px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '14px 10px' }}>Giocatore</th>
                    <th style={{ padding: '14px 10px' }}>
                      <ColumnTip label="Pt" title="Punti" />
                    </th>
                    {COLUMNS.map((c, i) => (
                      <th key={c.key} style={{ padding: i === COLUMNS.length - 1 ? '14px 18px 14px 10px' : '14px 10px', fontWeight: 700 }}>
                        <ColumnTip label={c.label} title={c.title} end={i >= COLUMNS.length - 3} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((r, i) => {
                    const p = players.get(r.playerId)!;
                    const next = data.standings[i + 1];
                    const cut = q > 0 && r.position <= q && !!next && next.position > q;
                    const bg = r.playerId === myId ? 'color-mix(in oklch, var(--mint) 35%, var(--surface))' : undefined;
                    return (
                      <tr key={r.playerId} style={{ borderTop: '1px solid var(--line)', borderBottom: cut ? '2px solid var(--accent)' : undefined, background: bg }}>
                        <td style={{ padding: '13px 10px 13px 18px', fontWeight: 900, fontStretch: '70%', fontSize: 18 }}>{r.position}</td>
                        <td style={{ padding: '11px 10px' }}>
                          <Link to={`/giocatori/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <Avatar player={p} size={28} />
                            {p.firstName} {p.lastName}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0 10px', fontWeight: 900, fontStretch: '70%', fontSize: 20 }}>{r.points}</td>
                        {COLUMNS.map((c, i) => (
                          <td key={c.key} style={{ textAlign: 'center', color: 'var(--ink2)', padding: i === COLUMNS.length - 1 ? '0 18px 0 10px' : '0 10px' }}>
                            {c.key === 'gamesDiff' && r.gamesDiff > 0 ? `+${r.gamesDiff}` : r[c.key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        <div className="st-list" style={{ padding: '0 16px' }}>
          <RankingList>
            {data.standings.map((r, i) => {
              const p = players.get(r.playerId)!;
              const next = data.standings[i + 1];
              const showCut = q > 0 && r.position <= q && (!next || next.position > q) && i < data.standings.length - 1;
              return (
                <Fragment key={r.playerId}>
                  <RankingRow
                    player={p}
                    position={r.position}
                    points={r.points}
                    sub={q > 0 && <ZonePill zone={r.zone} qualifiers={q} />}
                    highlight={r.playerId === myId}
                    open={expanded === r.playerId}
                    onToggle={() => setExpanded(expanded === r.playerId ? null : r.playerId)}
                    details={
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
                    }
                  />
                  {showCut && <RankingDivider label="Linea di taglio" />}
                </Fragment>
              );
            })}
          </RankingList>
        </div>
        </div>

      <div className="st-rules" style={{ margin: '4px 16px 0', padding: 18, borderRadius: 22, background: 'var(--hero)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </>
      )}
    </div>
  );
}

/** Classifica dei pronostici: punti a parte, non toccano quella del torneo */
function PredictionBoard({ data, myId }: { data: SeasonOverview; myId: string | null | undefined }) {
  const players = playerIndex(data.players);
  const leader = data.predictionStandings[0];
  const oracle = data.season.status === 'ARCHIVED' && leader && leader.points > 0 ? players.get(leader.playerId) : undefined;
  return (
    <>
      <div className="st-board">
        <div className="pr-list" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {oracle && (
            <div style={{ padding: '16px 18px', borderRadius: 22, background: 'var(--hero)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="kicker" style={{ color: '#C6EEDB' }}>
                Oracolo {data.season.label}
              </span>
              <span className="display" style={{ fontSize: 34 }}>
                {oracle.firstName} {oracle.lastName}
              </span>
            </div>
          )}
          <RankingList>
            {data.predictionStandings.map((r) => (
              <RankingRow
                key={r.playerId}
                player={players.get(r.playerId)!}
                position={r.position}
                points={r.points}
                highlight={r.playerId === myId}
                sub={
                  <span className="faint" style={{ fontSize: 12.5 }}>
                    {[
                      r.played === 0 ? 'Nessun pronostico concluso' : `${r.correct} su ${r.played} indovinati`,
                      r.upsets > 0 && (r.upsets === 1 ? '1 colpo grosso' : `${r.upsets} colpi grossi`),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                }
              />
            ))}
          </RankingList>
        </div>
      </div>
      <div className="st-rules" style={{ margin: '4px 16px 0', padding: 18, borderRadius: 22, background: 'var(--hero)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="title" style={{ fontSize: 22, color: '#C6EEDB' }}>
          Come funzionano i pronostici
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.85)' }}>
          <PredictionRules />
        </div>
      </div>
    </>
  );
}

/** Sigla di colonna con il significato: al passaggio del mouse o toccandola (su telefono non ci sono tooltip nativi) */
function ColumnTip({ label, title, end = false }: { label: string; title: string; end?: boolean }) {
  return (
    <span className={`col-tip${end ? ' end' : ''}`} data-tip={title} tabIndex={0} aria-label={title}>
      {label}
    </span>
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
