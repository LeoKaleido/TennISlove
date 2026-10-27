import { describe, expect, it } from 'vitest';
import { computeBadges, type BadgeId, type BadgeInput, type BadgeMatch } from '../src/badges';

const PLAYERS = ['me', 'p1', 'p2', 'p3'];
let n = 0;
const match = (
  a: string,
  b: string,
  set1: [number, number],
  set2: [number, number],
  stb: [number, number] | null = null,
  day = `2026-10-${String(10 + ++n).padStart(2, '0')}`,
): BadgeMatch => ({
  id: `m${n}`,
  playerAId: a,
  playerBId: b,
  score: { timeExpired: false, set1: { a: set1[0], b: set1[1] }, set2: { a: set2[0], b: set2[1] }, stb: stb && { a: stb[0], b: stb[1] } },
  playedOn: day,
  submittedAt: `${day}T20:00:00Z`,
  photoCount: 0,
});

const input = (matches: BadgeMatch[], extra: Partial<BadgeInput> = {}): BadgeInput => ({
  playerId: 'me',
  playerIds: PLAYERS,
  matches,
  predictions: null,
  final: null,
  ...extra,
});
const earned = (i: BadgeInput) => computeBadges(i).filter((b) => b.earned).map((b) => b.id);
const badge = (i: BadgeInput, id: BadgeId) => computeBadges(i).find((b) => b.id === id)!;

describe('computeBadges', () => {
  it('nessun badge senza partite', () => {
    expect(earned(input([]))).toEqual([]);
  });

  it('prima vittoria, cappotto e muro da un 6-0 6-2', () => {
    const m = match('me', 'p1', [6, 0], [6, 2]);
    expect(earned(input([m]))).toEqual(['FIRST_WIN', 'BAGEL', 'WALL']);
    expect(badge(input([m]), 'BAGEL').matchIds).toEqual([m.id]);
  });

  it('anche da giocatore B', () => {
    expect(earned(input([match('p1', 'me', [0, 6], [4, 6])]))).toEqual(['FIRST_WIN', 'BAGEL']);
  });

  it('livelli: ogni set 6-0 conta, anche in una partita persa; la prima vittoria una volta sola', () => {
    const i = input([match('me', 'p1', [6, 0], [6, 0]), match('me', 'p2', [6, 0], [3, 6], [5, 10]), match('me', 'p3', [6, 4], [6, 4])]);
    expect(badge(i, 'BAGEL').times).toBe(3);
    expect(badge(i, 'FIRST_WIN').times).toBe(1);
  });

  it('rimonta e super tie break', () => {
    const b = input([match('me', 'p1', [3, 6], [6, 4], [10, 7])]);
    expect(earned(b)).toEqual(['FIRST_WIN', 'COMEBACK']);
    expect(badge(b, 'TIEBREAK_KING')).toMatchObject({ progress: 1, target: 3, earned: false, times: 0 });
  });

  it('tris: 3 vittorie di fila, una sconfitta azzera la serie', () => {
    const broken = [match('me', 'p1', [6, 4], [6, 4]), match('me', 'p2', [6, 4], [6, 4]), match('me', 'p3', [4, 6], [4, 6]), match('me', 'p1', [6, 4], [6, 4])];
    expect(badge(input(broken), 'STREAK')).toMatchObject({ earned: false, progress: 1 });
    const three = [match('me', 'p1', [6, 4], [6, 4]), match('me', 'p2', [6, 4], [6, 4]), match('me', 'p3', [6, 4], [6, 4])];
    expect(badge(input(three), 'STREAK')).toMatchObject({ earned: true, times: 1, matchIds: [three[2].id] });
  });

  it('tris: 6 vittorie di fila sono 2 livelli', () => {
    const six = ['p1', 'p2', 'p3', 'p1', 'p2', 'p3'].map((o) => match('me', o, [6, 4], [6, 4]));
    expect(badge(input(six), 'STREAK')).toMatchObject({ times: 2, progress: 0 });
  });

  it('ammazzagrandi: battuto il primo in classifica di quel momento', () => {
    const lead = match('p1', 'p2', [6, 0], [6, 0]);
    const win = match('me', 'p1', [6, 4], [6, 4]);
    expect(badge(input([lead, win]), 'GIANT_KILLER')).toMatchObject({ earned: true, matchIds: [win.id] });
    // se p1 non aveva ancora giocato non era capolista
    expect(badge(input([match('me', 'p1', [6, 4], [6, 4])]), 'GIANT_KILLER').earned).toBe(false);
  });

  it('fotografo, pronostici e fine stagione', () => {
    const withPhotos = [1, 2, 3].map(() => ({ ...match('me', 'p1', [4, 6], [4, 6]), photoCount: 2 }));
    const i = input(withPhotos, {
      predictions: { correct: 11, upsets: 1 },
      final: { championId: 'me', position: 1, predictionPosition: 1, predictionPoints: 12 },
    });
    expect(earned(i)).toEqual(['PHOTOGRAPHER', 'SEER', 'UPSET', 'CHAMPION', 'ORACLE', 'PODIUM']);
    expect(badge(i, 'SEER')).toMatchObject({ times: 2, progress: 1 });
  });

  it('senza stagione chiusa niente badge di fine stagione', () => {
    expect(earned(input([], { predictions: { correct: 2, upsets: 0 } }))).toEqual([]);
    expect(badge(input([], { predictions: { correct: 2, upsets: 0 } }), 'SEER').progress).toBe(2);
  });
});
