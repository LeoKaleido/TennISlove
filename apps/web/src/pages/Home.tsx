import { Link } from 'react-router-dom';
import { formatDayWithWeekday, romeDay } from '@tentennis/shared';
import type { Match, SeasonOverview } from '../api';
import { MatchRow } from '../components/MatchRow';
import { Avatar, ErrorState, Loading, Logo, ScoreTable } from '../components/ui';
import { currentRound, isMine, matchInfo, opponentOf, playerIndex, roundRange, STATUS_STYLE, today, useMe, useSeason } from '../data';

/** La partita da mettere in evidenza per il giocatore */
function pickMyMatch(data: SeasonOverview, playerId: string, roundNumber: number): Match | undefined {
  const mine = data.matches.filter((m) => isMine(m, playerId));
  // prima un risultato inserito dall'avversario che aspetta la mia conferma
  const toConfirm = mine.find((m) => m.result?.status === 'PENDING' && m.result.submittedByPlayerId !== playerId);
  if (toConfirm) return toConfirm;
  const open = mine.filter((m) => !m.result).sort((a, b) => a.round - b.round);
  return open.find((m) => m.round <= roundNumber) ?? open[0] ?? mine.find((m) => m.round === roundNumber);
}

function cta(m: Match, playerId: string): { label: string; to: string } {
  if (m.result?.status === 'PENDING' && m.result.submittedByPlayerId !== playerId)
    return { label: 'Conferma il risultato', to: `/partite/${m.id}/conferma` };
  if (m.result) return { label: 'Vedi la partita', to: `/partite/${m.id}` };
  if (m.scheduledAt && romeDay(m.scheduledAt) <= today()) return { label: 'Inserisci risultato', to: `/partite/${m.id}/risultato` };
  if (m.scheduledAt) return { label: 'Modifica programma', to: `/partite/${m.id}?programma=1` };
  return { label: 'Programma la partita', to: `/partite/${m.id}?programma=1` };
}

export function HomePage() {
  const me = useMe();
  const season = useSeason();
  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const players = playerIndex(data.players);
  const myId = me.data?.playerId ?? null;
  const myPlayer = myId ? players.get(myId) : undefined;
  const round = currentRound(data.rounds);
  const day = today();
  const position = (id: string) => data.standings.find((s) => s.playerId === id);
  const posLabel = (id: string) => {
    const s = position(id);
    return s ? `${s.position}° in classifica, ${s.points} pt` : '';
  };

  const myMatch = myId && round ? pickMyMatch(data, myId, round.number) : undefined;
  const others = data.matches.filter((m) => m.round === round?.number && m.phase === 'ROUND_ROBIN' && m.id !== myMatch?.id);
  const recent = data.matches
    .filter((m) => m.result && m.result.status !== 'DISPUTED')
    .sort((a, b) => (b.result!.submittedAt > a.result!.submittedAt ? 1 : -1))
    .slice(0, 4);
  const clubName = (id: string | null) => data.clubs.find((c) => c.id === id)?.name;

  return (
    <div className="screen" style={{ gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
          <span className="title ellipsis" style={{ fontSize: 17, fontStretch: '72%', lineHeight: 1 }}>
            {data.season.name}
          </span>
          <span className="muted" style={{ fontSize: 11.5 }}>
            {data.season.subtitle}
          </span>
        </div>
        {me.data?.isAdmin && (
          <Link to="/admin" className="pill" style={{ border: '1px solid var(--line2)', color: 'var(--ink)', textDecoration: 'none', padding: '7px 11px' }}>
            Admin
          </Link>
        )}
        {myPlayer && (
          <Link to="/profilo" aria-label="Il tuo profilo">
            <Avatar player={myPlayer} size={38} />
          </Link>
        )}
      </div>

      {round && (
        <div style={{ margin: '0 10px', background: 'var(--hero)', color: '#fff', borderRadius: 28, padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 200, border: '2px solid rgba(198,238,219,.12)', borderRadius: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px', position: 'relative' }}>
            <div className="kicker" style={{ color: '#C6EEDB' }}>
              {round.startsOn <= day && day <= round.endsOn ? 'Giornata in corso' : 'Prossima giornata'}
            </div>
            <div className="display" style={{ fontSize: 60, lineHeight: 0.86 }}>
              Giornata {round.number}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}>
              {roundRange(round)}, stagione {data.season.label}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {data.rounds
                .filter((r) => r.phase === 'ROUND_ROBIN')
                .map((r) => (
                  <div
                    key={r.number}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: r.number < round.number ? '#C6EEDB' : r.number === round.number ? '#7FDDB5' : 'rgba(255,255,255,.18)',
                    }}
                  />
                ))}
            </div>
          </div>

          {myMatch && myId && myPlayer && <MyMatchCard match={myMatch} data={data} myId={myId} posLabel={posLabel} clubName={clubName} />}
        </div>
      )}

      {others.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 14px' }}>
          <div className="section-head">
            <h2 className="title">Questa settimana</h2>
            <Link to="/calendario" className="link-btn">
              Calendario
            </Link>
          </div>
          <div className="card">
            {others.map((m) => (
              <MatchRow key={m.id} match={m} data={data} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 14px' }}>
          <div className="section-head">
            <h2 className="title">Ultimi risultati</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((m) => (
              <Link key={m.id} to={`/partite/${m.id}`} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, color: 'inherit', textDecoration: 'none', borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600 }} className="faint">
                  <span>
                    Giornata {m.round}
                    {m.scheduledAt ? `, ${formatDayWithWeekday(romeDay(m.scheduledAt))}` : ''}
                  </span>
                  <StatusLabel match={m} />
                </div>
                <ScoreTable match={m} players={players} size="sm" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 14px' }}>
        <div className="section-head">
          <h2 className="title">Classifica</h2>
          <Link to="/classifica" className="link-btn">
            Completa
          </Link>
        </div>
        <div className="card">
          {data.standings.slice(0, 5).map((r) => {
            const p = players.get(r.playerId)!;
            return (
              <Link
                key={r.playerId}
                to={`/giocatori/${p.id}`}
                className="list-row"
                style={{ padding: '10px 14px', background: r.playerId === myId ? 'color-mix(in oklch, var(--mint) 28%, transparent)' : undefined }}
              >
                <span style={{ width: 20, fontWeight: 900, fontStretch: '70%', fontSize: 20 }}>{r.position}</span>
                <Avatar player={p} size={32} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{`${p.firstName} ${p.lastName}`}</span>
                <span style={{ fontWeight: 900, fontStretch: '70%', fontSize: 22 }}>{r.points}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatusLabel({ match }: { match: Match }) {
  const color = match.status === 'PROVISIONAL' ? 'var(--accent)' : 'var(--ink3)';
  return <span style={{ color }}>{match.status === 'PROVISIONAL' ? 'Provvisoria' : 'Confermata'}</span>;
}

function MyMatchCard({
  match,
  data,
  myId,
  posLabel,
  clubName,
}: {
  match: Match;
  data: SeasonOverview;
  myId: string;
  posLabel: (id: string) => string;
  clubName: (id: string | null) => string | undefined;
}) {
  const players = playerIndex(data.players);
  const me = players.get(myId)!;
  const opp = players.get(opponentOf(match, myId))!;
  const action = cta(match, myId);
  return (
    <div style={{ background: '#C6EEDB', color: '#0B1A24', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          La tua partita{match.round !== currentRound(data.rounds)?.number ? `, giornata ${match.round}` : ''}
        </span>
        <span className="pill" style={{ background: '#0B1A24', color: '#C6EEDB' }}>
          {STATUS_STYLE[match.status].label}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <Avatar player={me} size={52} ring="#0B1A24" />
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>
            Tu
            <br />
            <span style={{ fontWeight: 500, fontSize: 12.5 }}>{posLabel(myId)}</span>
          </div>
        </div>
        <div className="display" style={{ fontSize: 30, opacity: 0.5 }}>
          vs
        </div>
        <Link to={`/giocatori/${opp.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, color: '#0B1A24', textDecoration: 'none', textAlign: 'right' }}>
          <Avatar player={opp} size={52} ring="#0B1A24" />
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>
            {opp.shortName}
            <br />
            <span style={{ fontWeight: 500, fontSize: 12.5 }}>{posLabel(opp.id)}</span>
          </div>
        </Link>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.4, fontWeight: 600 }}>{matchInfo(match, data.rounds, clubName)}</div>
      <Link to={action.to} className="btn btn-dark">
        {action.label}
      </Link>
      <Link to={`/partite/${match.id}`} className="link-btn" style={{ textAlign: 'center', marginTop: -4, color: '#1F6F54' }}>
        Dettagli partita
      </Link>
    </div>
  );
}
