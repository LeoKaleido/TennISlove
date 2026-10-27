// Andamento in classifica (D-064): posizione a fine giornata, per uno o due giocatori.

import { useEffect, useRef, useState } from 'react';
import type { TimelinePoint } from '@tentennis/shared';
import type { Player } from '../api';

export interface ChartSeries {
  player: Player;
  /** variabile CSS del colore, es. 'var(--chart-a)' */
  color: string;
}

const H = 210;
const M = { top: 14, right: 40, bottom: 28, left: 34 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function PositionChart({
  timeline,
  series,
  playerCount,
  qualifiers,
}: {
  timeline: TimelinePoint[];
  series: ChartSeries[];
  playerCount: number;
  qualifiers: number;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = timeline.length;
  const w = Math.max(width - M.left - M.right, 1);
  const h = H - M.top - M.bottom;
  const x = (i: number) => M.left + (n === 1 ? w / 2 : (i * w) / (n - 1));
  const y = (pos: number) => M.top + (playerCount === 1 ? 0 : ((pos - 1) * h) / (playerCount - 1));
  const rowOf = (i: number, id: string) => timeline[i]!.rows.find((r) => r.playerId === id);

  // sull'asse solo il primo, l'ultimo e la linea di taglio
  const yTicks = [...new Set([1, qualifiers > 0 && qualifiers < playerCount ? qualifiers : 0, playerCount].filter((t) => t > 0))];
  const everyOther = n > 1 && w / (n - 1) < 26;

  const pick = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    const i = n === 1 ? 0 : Math.round(((px - M.left) / w) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const last = n - 1;
  const ends = series.map((s) => ({ s, pos: rowOf(last, s.player.id)?.position ?? playerCount }));
  // etichette finali solo se non si sovrappongono; altrimenti bastano legenda e riquadro al tocco
  const endLabels = ends.length < 2 || Math.abs(y(ends[0]!.pos) - y(ends[1]!.pos)) >= 16;

  return (
    <div className="pos-chart">
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.player.id}>
              <i style={{ background: s.color }} />
              {s.player.shortName}
            </span>
          ))}
        </div>
      )}
      <div
        ref={ref}
        style={{ position: 'relative', height: H, touchAction: 'pan-y' }}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={H} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="central" className="chart-tick">
                  {t}°
                </text>
              </g>
            ))}
            {qualifiers > 0 && qualifiers < playerCount && (
              <text x={M.left + w} y={y(qualifiers) + 11} textAnchor="end" className="chart-tick">
                Top {qualifiers}
              </text>
            )}
            {timeline.map((p, i) =>
              !everyOther || i % 2 === 0 || i === last ? (
                <text key={p.round} x={x(i)} y={H - 8} textAnchor="middle" className="chart-tick">
                  G{p.round}
                </text>
              ) : null,
            )}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top - 6} y2={M.top + h + 6} stroke="var(--line2)" strokeWidth={1} />}
            {series.map((s) => {
              const pts = timeline.map((_, i) => [x(i), y(rowOf(i, s.player.id)?.position ?? playerCount)] as const);
              return (
                <g key={s.player.id}>
                  <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map(([px, py], i) => (
                    <circle key={i} cx={px} cy={py} r={hover === i ? 5.5 : 4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                  ))}
                </g>
              );
            })}
            {endLabels &&
              ends.map(({ s, pos }) => (
                <text key={s.player.id} x={x(last) + 10} y={y(pos)} dominantBaseline="central" className="chart-end">
                  {pos}°
                </text>
              ))}
          </svg>
        )}
        {hover !== null && width > 0 && (
          // di lato al cursore, verso il centro, così non copre i punti
          <div
            className="chart-tip"
            style={{ left: x(hover) + (x(hover) < width / 2 ? 12 : -12), top: M.top, transform: x(hover) < width / 2 ? undefined : 'translateX(-100%)' }}
          >
            <strong>Giornata {timeline[hover]!.round}</strong>
            {series.map((s) => {
              const r = rowOf(hover, s.player.id);
              return (
                <span key={s.player.id}>
                  <i style={{ background: s.color }} />
                  {series.length > 1 && `${s.player.shortName} `}
                  {r ? `${r.position}°, ${r.points} pt` : '-'}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Posizione in classifica a fine giornata</caption>
        <thead>
          <tr>
            <th>Giornata</th>
            {series.map((s) => (
              <th key={s.player.id}>{s.player.shortName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeline.map((p, i) => (
            <tr key={p.round}>
              <td>{p.round}</td>
              {series.map((s) => {
                const r = rowOf(i, s.player.id);
                return <td key={s.player.id}>{r ? `${r.position}°, ${r.points} punti` : '-'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
