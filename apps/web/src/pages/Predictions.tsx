// Pagina Pronostici (D-061): partite da pronosticare, i propri pronostici chiusi e come sono andati.

import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { COUNTS_IN_STANDINGS } from '@tentennis/shared';
import type { SeasonOverview } from '../api';
import { PredictionPanel } from '../components/Predictions';
import { Chevron, Collapse, ErrorState, Loading } from '../components/ui';
import { currentRound, matchInfo, playerIndex, useMe, useSeason } from '../data';

type SeasonMatch = SeasonOverview['matches'][number];

const HOW: Record<string, string> = { TWO_SETS: 'in 2 set', SUPER_TIEBREAK: 'al super tie break' };

/** Esito di un proprio pronostico chiuso */
function verdict(m: SeasonMatch, myId: string): { text: string; tone: 'ok' | 'ko' | 'wait' | 'void'; points: number | null } {
  const v = m.predictions.voters?.find((x) => x.playerId === myId);
  const r = m.result;
  if (!r || !COUNTS_IN_STANDINGS.includes(r.status)) return { text: r ? 'Risultato contestato' : 'In attesa del risultato', tone: 'wait', points: null };
  if (!r.winner) return { text: 'Annullato: tempo scaduto senza vincitore', tone: 'void', points: null };
  if (!v || v.points === null || v.points === 0) return { text: 'Sbagliato', tone: 'ko', points: 0 };
  return { text: v.upset ? 'Colpo grosso!' : 'Indovinato', tone: 'ok', points: v.points };
}

export function PredictionsPage() {
  const me = useMe();
  const season = useSeason();
  // giornate aperte a mano; finché non se ne tocca nessuna, è aperta la prima con pronostici da fare
  const [opened, setOpened] = useState<Set<number> | null>(null);
  // fissata alla prima apertura: votando l'ultima partita la giornata non si richiude da sola
  const initialRound = useRef<number | null>(null);
  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const players = playerIndex(data.players);
  const myId = me.data?.playerId ?? null;
  const round = currentRound(data.rounds);
  const clubName = (id: string | null) => data.clubs.find((c) => c.id === id)?.name;
  const name = (id: string) => players.get(id)?.shortName ?? '';

  // aperte: per giornata, sempre nello stesso ordine (votare non sposta le righe)
  const open = data.matches.filter((m) => m.predictions.canPredict).sort((a, b) => a.round - b.round || a.code.localeCompare(b.code));
  const rounds = [...new Set(open.map((m) => m.round))];
  const todo = open.filter((m) => !m.predictions.mine).length;
  initialRound.current ??= rounds.find((n) => open.some((m) => m.round === n && !m.predictions.mine)) ?? -1;
  const firstTodo = initialRound.current;
  const mine = myId
    ? data.matches
        .filter((m) => !m.predictions.open && m.predictions.voters?.some((v) => v.playerId === myId))
        .sort((a, b) => b.round - a.round || b.code.localeCompare(a.code))
    : [];
  const row = data.predictionStandings.find((r) => r.playerId === myId);

  return (
    <div className="screen" style={{ gap: 18 }}>
      <div className="page-head">
        <h1 className="display">Pronostici</h1>
        <div className="sub">
          {row && row.played > 0 && <strong>{`Sei ${row.position}° con ${row.points} punti. `}</strong>}
          Scegli chi vince, e se vuoi come (+1). Dopo il voto vedi come hanno votato gli altri.
        </div>
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="section-head">
          <h2 className="title">Da pronosticare</h2>
          {todo === 0 && open.length > 0 && (
            <span className="faint" style={{ fontSize: 12.5 }}>
              Tutti fatti
            </span>
          )}
        </div>
        {open.length === 0 && (
          <div className="card muted" style={{ padding: 20, textAlign: 'center', fontSize: 13.5 }}>
            {myId ? 'Nessuna partita da pronosticare in questo momento.' : 'Pronosticano i giocatori del torneo.'}
          </div>
        )}
        {rounds.map((n) => {
          const list = open.filter((m) => m.round === n);
          const left = list.filter((m) => !m.predictions.mine).length;
          const isOpen = opened ? opened.has(n) : n === firstTodo;
          const toggle = () => {
            const next = new Set(opened ?? [firstTodo]);
            if (isOpen) next.delete(n);
            else next.add(n);
            setOpened(next);
          };
          return (
            <div key={n} className="card">
              <button className="list-row" onClick={toggle} aria-expanded={isOpen}>
                <div className="row-main">
                  <span className="row-title">
                    Giornata {n}
                    {round && n < round.number ? ', recuperi' : ''}
                  </span>
                </div>
                <span className={`pred-verdict ${left === 0 ? 'ok' : ''}`}>{left === 0 ? '✓ Fatti' : `${left} da fare`}</span>
                <Chevron open={isOpen} />
              </button>
              <Collapse open={isOpen}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {list.map((m) => (
                    <div key={m.id} style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
                      <PredictionPanel
                        match={m}
                        predictions={m.predictions}
                        players={players}
                        title={`${name(m.playerAId)} vs ${name(m.playerBId)}`}
                        sub={matchInfo(m, data.rounds, clubName)}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>

      {mine.length > 0 && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-head">
            <h2 className="title">I tuoi pronostici</h2>
          </div>
          <div className="card">
            {mine.map((m) => {
              const v = m.predictions.voters!.find((x) => x.playerId === myId)!;
              const res = verdict(m, myId!);
              const picked = name(v.pick === 'A' ? m.playerAId : m.playerBId);
              return (
                <Link key={m.id} to={`/partite/${m.id}`} className="list-row">
                  <div className="row-main">
                    <span className="row-title">
                      {name(m.playerAId)} vs {name(m.playerBId)}
                    </span>
                    <span className="row-sub">
                      Giornata {m.round}, avevi scelto {picked}
                      {v.how ? ` ${HOW[v.how]}` : ''}
                    </span>
                  </div>
                  <span className={`pred-verdict ${res.tone}`}>
                    {res.text}
                    {res.points ? ` +${res.points}` : ''}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '0 14px' }}>
        <Link to="/classifica?vista=pronostici" className="btn btn-outline" style={{ width: '100%' }}>
          Classifica dei pronostici
        </Link>
      </div>
    </div>
  );
}
