import { describe, expect, it } from 'vitest';
import { roundRobin, scheduleWeeks, validateRoundRobin } from '../src/calendar';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('roundRobin', () => {
  it('12 giocatori: 11 giornate da 6 partite, girone completo', () => {
    const rounds = roundRobin(ids(12), 7);
    expect(rounds).toHaveLength(11);
    expect(rounds.every((r) => r.pairs.length === 6 && r.bye === null)).toBe(true);
    expect(validateRoundRobin(ids(12), rounds.map((r) => r.pairs))).toBeNull();
  });

  it('numero dispari: ognuno riposa una volta', () => {
    const rounds = roundRobin(ids(7), 3);
    expect(rounds).toHaveLength(7);
    expect(new Set(rounds.map((r) => r.bye)).size).toBe(7);
    expect(validateRoundRobin(ids(7), rounds.map((r) => r.pairs))).toBeNull();
  });

  it('lo stesso seme dà lo stesso calendario, un altro seme lo rimescola', () => {
    expect(roundRobin(ids(8), 5)).toEqual(roundRobin(ids(8), 5));
    expect(roundRobin(ids(8), 5)).not.toEqual(roundRobin(ids(8), 6));
  });
});

describe('scheduleWeeks', () => {
  it('riproduce le date del 2026/27 con la pausa natalizia', () => {
    const weeks = scheduleWeeks('2026-10-12', 11, [{ from: '2026-12-19', to: '2027-01-10' }]);
    expect(weeks[0]).toEqual({ startsOn: '2026-10-12', endsOn: '2026-10-18', pauseAfter: null });
    expect(weeks[9]).toEqual({ startsOn: '2026-12-14', endsOn: '2026-12-18', pauseAfter: 'Pausa, 19 dic - 10 gen' });
    expect(weeks[10]).toEqual({ startsOn: '2027-01-11', endsOn: '2027-01-17', pauseAfter: null });
  });

  it('pausa che inizia di lunedì: la giornata precedente resta intera', () => {
    const weeks = scheduleWeeks('2026-10-05', 3, [{ from: '2026-10-12', to: '2026-10-18' }]);
    expect(weeks.map((w) => [w.startsOn, w.endsOn])).toEqual([
      ['2026-10-05', '2026-10-11'],
      ['2026-10-19', '2026-10-25'],
      ['2026-10-26', '2026-11-01'],
    ]);
    expect(weeks[0]!.pauseAfter).toBe('Pausa, 12 ott - 18 ott');
  });
});

describe('validateRoundRobin', () => {
  it('segnala partite ripetute o mancanti', () => {
    expect(validateRoundRobin(ids(4), [[['p1', 'p2'], ['p3', 'p4']], [['p2', 'p1'], ['p3', 'p4']]])).toMatch(/ripetuta/);
    expect(validateRoundRobin(ids(4), [[['p1', 'p2'], ['p3', 'p4']]])).toMatch(/Servono 6/);
  });
});
