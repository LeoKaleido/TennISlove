import type { MatchEvaluation } from '@tentennis/shared';

type Outcome = 'win' | 'lose' | 'tie' | 'none';

/** Colori pastello dell'esito: verde chi vince, rosso chi perde, giallo senza vincitore */
export function outcomeColors(o: Outcome) {
  if (o === 'none') return { background: 'var(--surface2)', color: 'var(--ink3)' };
  return { background: `var(--${o}Bg)`, color: `var(--${o}Fg)` };
}

export function sideOutcome(ev: MatchEvaluation, side: 'A' | 'B'): Outcome {
  if (ev.status !== 'OK') return 'none';
  if (!ev.winner) return 'tie';
  return ev.winner === side ? 'win' : 'lose';
}

/** Anteprima punti: nomi in colonna, punteggio accanto con il colore dell'esito */
export function PointsPreview({ ev, names }: { ev: MatchEvaluation; names: [string, string] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(['A', 'B'] as const).map((side, i) => {
        const outcome = sideOutcome(ev, side);
        return (
          <div key={side} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="ellipsis" style={{ fontWeight: outcome === 'win' ? 800 : 600, fontSize: 15 }}>
              {names[i]}
            </span>
            <span className="outcome-badge" style={outcomeColors(outcome)}>
              {outcome === 'none' ? '-' : side === 'A' ? ev.pointsA : ev.pointsB}
            </span>
          </div>
        );
      })}
    </div>
  );
}
