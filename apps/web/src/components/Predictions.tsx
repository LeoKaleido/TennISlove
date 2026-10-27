// Pronostici tra giocatori (D-061): scelta del vincitore e del modo, percentuali e chi ha scelto cosa.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PREDICTION_POINTS, type PredictionHow, type Side } from '@tentennis/shared';
import { api, type Match, type MatchPredictions, type Player } from '../api';
import { Avatar, useToast } from './ui';

type Pick = { pick: Side; how: PredictionHow | null };

const HOW_LABEL: Record<PredictionHow, string> = { TWO_SETS: 'In 2 set', SUPER_TIEBREAK: 'Al super tie break' };

const votes = (n: number) => (n === 1 ? '1 pronostico' : `${n} pronostici`);

export function PredictionPanel({
  match,
  predictions: p,
  players,
  title,
}: {
  match: Match;
  predictions: MatchPredictions;
  players: Map<string, Player>;
  /** in Home: chi gioca, al posto di "Pronostici" */
  title?: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  // la scelta appena fatta si vede subito, senza aspettare il ricaricamento della stagione
  const [optimistic, setOptimistic] = useState<Pick | null>(null);
  const save = useMutation({
    mutationFn: (body: Pick) => api(`/api/matches/${match.id}/prediction`, { method: 'PUT', body }),
    onMutate: (body) => setOptimistic(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['season'] }),
    onError: (e) => {
      setOptimistic(null);
      toast(e.message);
    },
  });
  const mine = optimistic ?? p.mine;
  const a = players.get(match.playerAId)!;
  const b = players.get(match.playerBId)!;

  let status: string;
  if (p.open) status = p.canPredict && !mine ? `${votes(p.count)}, scegli per vedere come votano gli altri` : votes(p.count);
  else status = p.count === 0 ? 'Nessun pronostico' : `Chiusi, ${votes(p.count)}`;

  return (
    <div className="pred">
      <div className="pred-head">
        <span className="pred-title">{title ?? 'Pronostici'}</span>
        <span className="faint">{status}</span>
      </div>

      {p.canPredict && (
        <>
          <div className="pred-picks">
            {([['A', a], ['B', b]] as const).map(([side, pl]) => (
              <button
                key={side}
                className="pred-pick"
                aria-pressed={mine?.pick === side}
                onClick={() => save.mutate({ pick: side, how: mine?.pick === side ? mine.how : null })}
              >
                <Avatar player={pl} size={30} />
                <span>{pl.shortName}</span>
              </button>
            ))}
          </div>
          {mine && (
            <div className="pred-how">
              <span className="faint">Come vince? +{PREDICTION_POINTS.how}</span>
              {(Object.keys(HOW_LABEL) as PredictionHow[]).map((how) => (
                <button
                  key={how}
                  className="chip"
                  aria-pressed={mine.how === how}
                  // toccando di nuovo la scelta si toglie
                  onClick={() => save.mutate({ pick: mine.pick, how: mine.how === how ? null : how })}
                >
                  {HOW_LABEL[how]}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {p.split && p.count > 0 && <SplitBar a={a} b={b} split={p.split} />}

      {p.voters && p.voters.length > 0 && (
        <div className="pred-voters">
          {(['A', 'B'] as const).map((side) => {
            const list = p.voters!.filter((v) => v.pick === side);
            if (list.length === 0) return null;
            return (
              <div key={side} className="pred-side">
                <span className="faint">Per {(side === 'A' ? a : b).shortName}</span>
                <div className="pred-names">
                  {list.map((v) => {
                    const pl = players.get(v.playerId);
                    if (!pl) return null;
                    return (
                      <span key={v.playerId} className="pred-voter" title={v.how ? HOW_LABEL[v.how] : undefined}>
                        <Avatar player={pl} size={22} />
                        {pl.shortName}
                        {v.points !== null && v.points > 0 && <strong className="pred-pts">+{v.points}</strong>}
                        {v.upset && <span className="pred-upset">colpo grosso</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SplitBar({ a, b, split }: { a: Player; b: Player; split: { A: number; B: number } }) {
  const total = split.A + split.B;
  const pa = Math.round((split.A / total) * 100);
  return (
    <div className="pred-split">
      <div className="pred-bar" role="img" aria-label={`${a.shortName} ${pa}%, ${b.shortName} ${100 - pa}%`}>
        <span style={{ width: `${pa}%` }} />
      </div>
      <div className="pred-legend">
        <span>
          {a.shortName} <strong>{pa}%</strong>
        </span>
        <span>
          <strong>{100 - pa}%</strong> {b.shortName}
        </span>
      </div>
    </div>
  );
}

/** Regole in breve, per la classifica dei pronostici */
export function PredictionRules() {
  return (
    <>
      Vincitore giusto {PREDICTION_POINTS.winner} punti, modo giusto (2 set o super tie break) +{PREDICTION_POINTS.how}. Colpo grosso +
      {PREDICTION_POINTS.upset} se il vincitore l'avevate scelto al massimo 1 su 4. Si vota fino all'inizio della partita; con tempo scaduto senza
      vincitore il pronostico non conta. Punti a parte: non cambiano la classifica del torneo.
    </>
  );
}
