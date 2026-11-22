// Simulatore "cosa mi serve per salire" (D-066): dove finiresti con alcuni risultati tipici della tua prossima partita.

import { useState } from 'react';
import { COUNTS_IN_STANDINGS, evaluateMatch, SCENARIOS, scenarioScore, standingsIf } from '@tentennis/shared';
import type { Match, SeasonOverview } from '../api';
import { opponentOf, playerIndex } from '../data';
import { Avatar, Collapse } from './ui';

/** Freccia e numero di posizioni guadagnate o perse */
function Move({ from, to }: { from: number; to: number }) {
  const d = from - to;
  if (d === 0) return <span className="sim-move same">=</span>;
  return <span className={`sim-move ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
}

export function Simulator({ match, data, myId }: { match: Match; data: SeasonOverview; myId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const players = playerIndex(data.players);
  const oppId = opponentOf(match, myId);
  const opp = players.get(oppId)!;
  const playerIds = data.players.map((p) => p.id);
  const opts = { qualifiers: data.season.qualifiers };
  const played = data.matches
    .filter((m) => m.phase === 'ROUND_ROBIN' && m.result && COUNTS_IN_STANDINGS.includes(m.result.status))
    .map((m) => ({ playerAId: m.playerAId, playerBId: m.playerBId, score: m.result! }));
  const now = (id: string) => data.standings.find((r) => r.playerId === id)!;

  const rows = SCENARIOS.map((s) => {
    const score = scenarioScore(s.sets, match.playerAId === myId);
    const table = standingsIf(playerIds, played, { playerAId: match.playerAId, playerBId: match.playerBId, score }, opts);
    const ev = evaluateMatch(score);
    return {
      label: s.label,
      gained: match.playerAId === myId ? ev.pointsA : ev.pointsB,
      me: table.find((r) => r.playerId === myId)!,
      opp: table.find((r) => r.playerId === oppId)!,
      table,
    };
  });

  return (
    <div className="card" style={{ padding: '14px 0 4px' }}>
      <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Oggi sei {now(myId).position}° con {now(myId).points} punti. Dove finiresti dopo questa partita:
        </span>
      </div>
      <div className="sim-head">
        <span>Risultato</span>
        <span>Punti</span>
        <span>Tu</span>
        <span>{opp.shortName}</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.label}>
          <button className="sim-row" aria-expanded={selected === i} onClick={() => setSelected(selected === i ? null : i)}>
            <span className="sim-label">{r.label}</span>
            <span className="sim-pts">+{r.gained}</span>
            <span className="sim-pos">
              {r.me.position}° <Move from={now(myId).position} to={r.me.position} />
            </span>
            <span className="sim-pos faint">{r.opp.position}°</span>
          </button>
          <Collapse open={selected === i}>
            <MiniTable table={r.table} focus={[myId, oppId]} players={players} before={data.standings} />
          </Collapse>
        </div>
      ))}
    </div>
  );
}

/** La parte di classifica intorno a chi guarda e all'avversario, come sarebbe */
function MiniTable({
  table,
  focus,
  players,
  before,
}: {
  table: ReturnType<typeof standingsIf>;
  focus: [string, string];
  players: ReturnType<typeof playerIndex>;
  before: SeasonOverview['standings'];
}) {
  const idx = focus.map((id) => table.findIndex((r) => r.playerId === id));
  const from = Math.max(0, Math.min(...idx) - 1);
  const to = Math.min(table.length, Math.max(...idx) + 2);
  return (
    <div className="sim-table">
      {table.slice(from, to).map((r) => {
        const p = players.get(r.playerId)!;
        const prev = before.find((x) => x.playerId === r.playerId)!;
        return (
          <div key={r.playerId} className={`sim-table-row${r.playerId === focus[0] ? ' me' : ''}`}>
            <span style={{ width: 22, fontWeight: 900, fontStretch: '70%', fontSize: 16 }}>{r.position}</span>
            <Avatar player={p} size={22} />
            <span style={{ flex: 1, fontWeight: 600 }}>{p.shortName}</span>
            <Move from={prev.position} to={r.position} />
            <span style={{ width: 34, textAlign: 'right', fontWeight: 800 }}>{r.points}</span>
          </div>
        );
      })}
    </div>
  );
}
