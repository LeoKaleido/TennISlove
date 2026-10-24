import { describe, expect, it } from 'vitest';
import { computeStandings, type StandingsMatch } from '../src/standings';

// Ordine dell'elenco iniziale (foglio Calcoli dell'Excel)
const PLAYERS = ['giuseppe', 'marco', 'alessandroC', 'alessandroP', 'francesco', 'fabrizio', 'alessio', 'leonardo', 'gennaro', 'federico', 'michele', 'luca'];

const match = (
  a: string,
  b: string,
  set1: [number, number],
  set2: [number, number],
  stb: [number, number] | null = null,
  timeExpired = false,
): StandingsMatch => ({
  playerAId: a,
  playerBId: b,
  score: {
    timeExpired,
    set1: { a: set1[0], b: set1[1] },
    set2: { a: set2[0], b: set2[1] },
    stb: stb && { a: stb[0], b: stb[1] },
  },
});

// Gli 8 risultati registrati nell'Excel al 22/10/2026
const EXCEL_RESULTS: StandingsMatch[] = [
  match('giuseppe', 'luca', [6, 2], [6, 2]),
  match('marco', 'michele', [6, 1], [6, 3]),
  match('alessandroC', 'federico', [1, 6], [2, 6]),
  match('alessandroP', 'gennaro', [6, 3], [6, 2]),
  match('francesco', 'leonardo', [2, 6], [6, 4], [10, 5]),
  match('fabrizio', 'alessio', [3, 6], [3, 6]),
  match('luca', 'federico', [0, 6], [2, 6]),
  match('alessandroP', 'alessio', [4, 6], [6, 3], [9, 11]),
];

describe('classifica dell\'Excel al 22/10/2026', () => {
  const rows = computeStandings(PLAYERS, EXCEL_RESULTS);
  const by = (id: string) => rows.find((r) => r.playerId === id)!;

  it('punti uguali all\'Excel', () => {
    expect(rows.map((r) => [r.playerId, r.points])).toEqual([
      ['federico', 30],
      ['alessio', 28],
      ['alessandroP', 25],
      ['giuseppe', 15],
      ['marco', 15],
      ['francesco', 13],
      ['leonardo', 10],
      ['fabrizio', 6],
      ['luca', 6],
      ['gennaro', 5],
      ['michele', 4],
      ['alessandroC', 3],
    ]);
  });

  it('posizioni con ex aequo', () => {
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4, 4, 6, 7, 8, 8, 10, 11, 12]);
  });

  it('statistiche come le colonne dell\'Excel', () => {
    expect(by('federico')).toMatchObject({ played: 2, won: 2, lost: 0, noResult: 0, gamesWon: 24, gamesLost: 5, gamesDiff: 19, bonus: 6 });
    expect(by('alessio')).toMatchObject({ played: 2, won: 2, gamesWon: 21, gamesLost: 16, bonus: 7 });
    expect(by('alessandroP')).toMatchObject({ played: 2, won: 1, lost: 1, gamesWon: 22, gamesLost: 14, bonus: 3 });
  });

  it('zone: parità al taglio sull\'8° posto', () => {
    expect(by('federico').zone).toBe('TOP');
    expect(by('fabrizio').zone).toBe('CUT_TIE');
    expect(by('luca').zone).toBe('CUT_TIE');
    expect(by('gennaro').zone).toBe('OUT');
  });

  it('chi non ha punti è "da definire"', () => {
    const fresh = computeStandings(['x', 'y'], []);
    expect(fresh.every((r) => r.zone === 'TBD' && r.position === 1)).toBe(true);
  });
});

describe('spareggi', () => {
  it('due a pari punti: vince lo scontro diretto, anche se in elenco viene dopo', () => {
    // x batte y 6-0 6-0 (15 a 0); y batte z 6-0 6-0 (15 a 0) → x e y a 15
    const rows = computeStandings(
      ['y', 'x', 'z'],
      [match('x', 'y', [6, 0], [6, 0]), match('y', 'z', [6, 0], [6, 0])],
    );
    expect(rows.map((r) => [r.playerId, r.position])).toEqual([
      ['x', 1],
      ['y', 2],
      ['z', 3],
    ]);
  });

  it('due a pari punti con scontro diretto giocato', () => {
    const rows = computeStandings(
      ['b', 'a', 'c'],
      [match('a', 'b', [7, 5], [7, 5]), match('b', 'c', [3, 6], [4, 6])],
    );
    // a: 14+3 = 17; b: 10 + 7 = 17; c: 12+3 = 15
    expect(rows.map((r) => [r.playerId, r.points, r.position])).toEqual([
      ['a', 17, 1],
      ['b', 17, 2],
      ['c', 15, 3],
    ]);
  });

  it('due a pari punti senza scontro diretto: ex aequo', () => {
    const rows = computeStandings(['a', 'b', 'c', 'd'], [match('a', 'c', [6, 0], [6, 0]), match('b', 'd', [6, 0], [6, 0])]);
    expect(rows.slice(0, 2).map((r) => r.position)).toEqual([1, 1]);
  });

  it('tre a pari punti: punti negli scontri tra loro, poi differenza game', () => {
    // Girone a tre in cui ognuno vince una partita con lo stesso punteggio: tutti 15+4 = 19
    const rows = computeStandings(
      ['a', 'b', 'c'],
      [match('a', 'b', [6, 2], [6, 2]), match('b', 'c', [6, 2], [6, 2]), match('c', 'a', [6, 2], [6, 2])],
    );
    expect(rows.every((r) => r.points === 19 && r.position === 1)).toBe(true);
  });
});
