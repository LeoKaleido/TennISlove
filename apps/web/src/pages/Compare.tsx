// Testa a testa (D-064): due giocatori a confronto.

import { Link, useParams } from 'react-router';
import { COUNTS_IN_STANDINGS } from '@tentennis/shared';
import type { Match, Player, SeasonOverview } from '../api';
import { badgesFor } from '../badges';
import { PositionChart } from '../components/PositionChart';
import { Avatar, BackButton, ErrorState, HelpLink, Loading, ScoreTable, StatusPill } from '../components/ui';
import { isMine, playerIndex, timelineFor, useSeason } from '../data';

const COLOR_A = 'var(--chart-a)';
const COLOR_B = 'var(--chart-b)';

/** Esito di una partita dal punto di vista di un giocatore, se il risultato conta */
function outcome(m: Match, playerId: string) {
  const r = m.result;
  if (!r || !COUNTS_IN_STANDINGS.includes(r.status)) return null;
  const side = m.playerAId === playerId ? 'A' : 'B';
  return {
    won: r.winner === side,
    lost: r.winner !== null && r.winner !== side,
    points: side === 'A' ? r.pointsA : r.pointsB,
    against: side === 'A' ? r.pointsB : r.pointsA,
    stb: r.how === 'SUPER_TIEBREAK' && r.winner === side,
  };
}

function statsOf(data: SeasonOverview, playerId: string) {
  const row = data.standings.find((s) => s.playerId === playerId);
  const results = data.matches.filter((m) => isMine(m, playerId)).flatMap((m) => outcome(m, playerId) ?? []);
  return {
    row,
    points: row?.points ?? 0,
    won: row?.won ?? 0,
    played: row?.played ?? 0,
    gamesWon: row?.gamesWon ?? 0,
    gamesDiff: row?.gamesDiff ?? 0,
    perMatch: row && row.played > 0 ? row.points / row.played : 0,
    stbWins: results.filter((r) => r.stb).length,
    badges: badgesFor(data, playerId).reduce((n, b) => n + b.times, 0),
    predictions: data.predictionStandings.find((r) => r.playerId === playerId)?.points ?? 0,
  };
}

export function ComparePage() {
  const { a: aId, b: bId } = useParams<{ a: string; b: string }>();
  const season = useSeason();
  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const players = playerIndex(data.players);
  const a = players.get(aId ?? '');
  const b = players.get(bId ?? '');
  if (!a || !b || a.id === b.id) return <ErrorState error={new Error('Giocatori non trovati in questo torneo')} />;

  const direct = data.matches.find((m) => isMine(m, a.id) && isMine(m, b.id));
  const sa = statsOf(data, a.id);
  const sb = statsOf(data, b.id);
  const timeline = timelineFor(data);

  const rows: { label: string; va: number; vb: number; text?: (v: number) => string; bars?: boolean }[] = [
    { label: 'Punti', va: sa.points, vb: sb.points },
    { label: 'Partite vinte', va: sa.won, vb: sb.won },
    { label: 'Partite giocate', va: sa.played, vb: sb.played },
    { label: 'Game fatti', va: sa.gamesWon, vb: sb.gamesWon },
    { label: 'Differenza game', va: sa.gamesDiff, vb: sb.gamesDiff, text: (v) => (v > 0 ? `+${v}` : String(v)), bars: false },
    { label: 'Punti a partita', va: sa.perMatch, vb: sb.perMatch, text: (v) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) },
    { label: 'Vinte al super tie break', va: sa.stbWins, vb: sb.stbWins },
    { label: 'Badge', va: sa.badges, vb: sb.badges },
    { label: 'Punti pronostici', va: sa.predictions, vb: sb.predictions },
  ];

  // avversari affrontati da entrambi, con il risultato che conta
  const common = data.players
    .filter((o) => o.id !== a.id && o.id !== b.id)
    .flatMap((o) => {
      const ma = data.matches.find((m) => isMine(m, a.id) && isMine(m, o.id));
      const mb = data.matches.find((m) => isMine(m, b.id) && isMine(m, o.id));
      const ra = ma && outcome(ma, a.id);
      const rb = mb && outcome(mb, b.id);
      return ra && rb && ma && mb ? [{ o, ma, mb, ra, rb }] : [];
    });

  return (
    <div className="screen">
      <div style={{ background: 'var(--hero)', color: '#fff', padding: '16px 16px 22px', display: 'flex', flexDirection: 'column', gap: 18, borderRadius: '0 0 28px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 }}>
          <BackButton />
          <span className="kicker with-help" style={{ color: '#C6EEDB' }}>
            Testa a testa <HelpLink to="testa-a-testa" label="testa a testa" onDark />
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          {[
            { p: a, s: sa, color: COLOR_A },
            { p: b, s: sb, color: COLOR_B },
          ].map(({ p, s, color }, i) => (
            <Link key={p.id} to={`/giocatori/${p.id}`} style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#fff', textDecoration: 'none', textAlign: 'center' }}>
              <span style={{ borderRadius: '50%', boxShadow: `0 0 0 3px ${color}` }}>
                <Avatar player={p} size={72} />
              </span>
              <span className="display" style={{ fontSize: 26 }}>
                {p.shortName}
              </span>
              {s.row && (
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>
                  {s.row.position}°, {s.row.points} pt
                </span>
              )}
            </Link>
          ))}
          <span className="display" style={{ gridColumn: 2, gridRow: 1, fontSize: 30, opacity: 0.5 }}>
            vs
          </span>
        </div>
      </div>

      {direct && <DirectMatch match={direct} players={players} />}

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="section-head">
          <h2 className="title">Numeri a confronto</h2>
        </div>
        <div className="card cmp-table">
          {rows.map((r) => {
            const fmt = r.text ?? String;
            const max = Math.max(Math.abs(r.va), Math.abs(r.vb));
            const lead = r.va === r.vb ? null : r.va > r.vb ? 'a' : 'b';
            const bars = r.bars !== false && max > 0;
            return (
              <div key={r.label} className="cmp-row">
                <span className={`cmp-val${lead === 'a' ? ' lead' : ''}`}>{fmt(r.va)}</span>
                <span className="cmp-mid">
                  <span className="cmp-label">{r.label}</span>
                  {bars && (
                    <span className="cmp-bars" aria-hidden>
                      <span className="cmp-half left">
                        <i style={{ width: `${(r.va / max) * 100}%`, background: COLOR_A }} />
                      </span>
                      <span className="cmp-half">
                        <i style={{ width: `${(r.vb / max) * 100}%`, background: COLOR_B }} />
                      </span>
                    </span>
                  )}
                </span>
                <span className={`cmp-val${lead === 'b' ? ' lead' : ''}`}>{fmt(r.vb)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {timeline.length > 1 && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-head">
            <h2 className="title">Andamento in classifica</h2>
          </div>
          <div className="card" style={{ padding: '14px 14px 8px' }}>
            <PositionChart
              timeline={timeline}
              series={[
                { player: a, color: COLOR_A },
                { player: b, color: COLOR_B },
              ]}
              playerCount={data.players.length}
              qualifiers={data.season.qualifiers}
            />
          </div>
        </div>
      )}

      {common.length > 0 && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-head">
            <h2 className="title">Avversari in comune</h2>
          </div>
          <div className="card">
            <div className="cmp-common head">
              <span>{a.shortName}</span>
              <span />
              <span>{b.shortName}</span>
            </div>
            {common.map(({ o, ma, mb, ra, rb }) => (
              <div key={o.id} className="cmp-common">
                <Result to={`/partite/${ma.id}`} r={ra} />
                <span className="cmp-opp">
                  <Avatar player={o} size={26} />
                  {o.shortName}
                </span>
                <Result to={`/partite/${mb.id}`} r={rb} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectMatch({ match, players }: { match: Match; players: Map<string, Player> }) {
  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-head">
        <h2 className="title">Scontro diretto</h2>
        <span className="faint" style={{ fontSize: 12.5 }}>
          Giornata {match.round}
        </span>
      </div>
      <Link to={`/partite/${match.id}`} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, color: 'inherit', textDecoration: 'none' }}>
        {match.result ? (
          <ScoreTable match={match} players={players} size="sm" />
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontWeight: 600, fontSize: 14 }}>
            Ancora da giocare
            <StatusPill status={match.status} />
          </span>
        )}
      </Link>
    </div>
  );
}

function Result({ to, r }: { to: string; r: NonNullable<ReturnType<typeof outcome>> }) {
  const label = r.won ? 'Vinta' : r.lost ? 'Persa' : 'Pari';
  return (
    <Link to={to} className={`cmp-res${r.won ? ' won' : r.lost ? ' lost' : ''}`}>
      {label} {r.points}-{r.against}
    </Link>
  );
}
