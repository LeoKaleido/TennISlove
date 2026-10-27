import { describe, expect, it } from 'vitest';
import { evaluateMatch } from '../src/scoring';
import { SCENARIOS, scenarioScore, standingsIf } from '../src/simulator';
import type { StandingsMatch } from '../src/standings';

describe('simulatore', () => {
  it('ogni scenario è un punteggio valido con il vincitore atteso, da A e da B', () => {
    for (const s of SCENARIOS) {
      const wins = s.label.startsWith('Vinci');
      for (const viewerIsA of [true, false]) {
        const ev = evaluateMatch(scenarioScore(s.sets, viewerIsA));
        expect(ev.status, s.label).toBe('OK');
        expect(ev.winner, s.label).toBe(wins === viewerIsA ? 'A' : 'B');
      }
    }
  });

  it('la classifica tiene conto della partita simulata', () => {
    const played: StandingsMatch[] = [
      { playerAId: 'p1', playerBId: 'p2', score: { timeExpired: false, set1: { a: 6, b: 0 }, set2: { a: 6, b: 0 }, stb: null } },
    ];
    const extra = { playerAId: 'me', playerBId: 'p1', score: scenarioScore(SCENARIOS[0]!.sets, true) };
    const rows = standingsIf(['p1', 'p2', 'me'], played, extra, { qualifiers: 0 });
    expect(rows[0]).toMatchObject({ playerId: 'me', points: 15 });
  });
});
