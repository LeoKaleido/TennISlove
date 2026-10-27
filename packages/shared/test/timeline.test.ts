import { describe, expect, it } from 'vitest';
import { standingsTimeline, type TimelineMatch } from '../src/timeline';

const win = (a: string, b: string, playedOn: string): TimelineMatch => ({
  playerAId: a,
  playerBId: b,
  playedOn,
  score: { timeExpired: false, set1: { a: 6, b: 2 }, set2: { a: 6, b: 2 }, stb: null },
});

const ROUNDS = [
  { number: 1, startsOn: '2026-10-12', endsOn: '2026-10-18' },
  { number: 2, startsOn: '2026-10-19', endsOn: '2026-10-25' },
  { number: 3, startsOn: '2026-10-26', endsOn: '2026-11-01' },
];

describe('standingsTimeline', () => {
  it('classifica a fine giornata, solo per le giornate iniziate', () => {
    const t = standingsTimeline(['p1', 'p2', 'p3'], [win('p1', 'p2', '2026-10-14'), win('p3', 'p1', '2026-10-21')], ROUNDS, '2026-10-22');
    expect(t.map((p) => p.round)).toEqual([1, 2]);
    expect(t[0]!.rows.find((r) => r.playerId === 'p1')!.position).toBe(1);
    expect(t[1]!.rows.find((r) => r.playerId === 'p3')!.points).toBe(15);
    expect(t[0]!.rows.find((r) => r.playerId === 'p3')!.played).toBe(0);
  });
});
