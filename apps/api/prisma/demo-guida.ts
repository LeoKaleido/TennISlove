// Torneo dimostrativo per gli screenshot della guida (D-067): giocatori inventati, risultati verosimili.
// Uso, dentro il container di sviluppo (vedi scripts/guida/README.md):
//   tsx prisma/demo-guida.ts create   crea il torneo e stampa il token di sessione di Andrea
//   tsx prisma/demo-guida.ts remove   cancella torneo, giocatori e account dimostrativi
// Il torneo dimostrativo diventa quello "in corso" finché non lo si cancella: solo in sviluppo.

import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient, type Player } from '@prisma/client';
import { addDays, fromRomeLocal, roundRobin } from '@tentennis/shared';

const db = new PrismaClient();
const NAME = 'Torneo dimostrativo';
const DOMAIN = '@example.test';

const PLAYERS = [
  ['Andrea', 'Conti'],
  ['Davide', 'Ferri'],
  ['Matteo', 'Gallo'],
  ['Simone', 'Rinaldi'],
  ['Stefano', 'Moretti'],
  ['Riccardo', 'Lombardi'],
  ['Filippo', 'Greco'],
  ['Tommaso', 'Bruno'],
] as const;

/** Prima giornata: oggi cade nella quarta */
const START = '2026-10-05';
const ROUNDS_PLAYED = 3;

type Score = [number, number][];
/** Punteggi dal punto di vista del giocatore A, a rotazione per le partite tra gli altri */
const OTHERS: Score[] = [
  [[6, 3], [6, 4]],
  [[4, 6], [6, 2], [10, 8]],
  [[7, 5], [6, 4]],
  [[2, 6], [3, 6]],
  [[6, 1], [6, 2]],
  [[6, 7], [6, 4], [10, 6]],
  [[3, 6], [4, 6]],
  [[6, 4], [3, 6], [7, 10]],
];
/** Andrea: un 6-0 (Cappotto), una rimonta (Rimonta), tre vittorie di fila (Tris) */
const ANDREA: Score[] = [
  [[6, 0], [6, 3]],
  [[4, 6], [6, 3], [10, 7]],
  [[6, 4], [6, 2]],
];

const flip = (s: Score): Score => s.map(([a, b]) => [b, a]);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

async function remove() {
  const season = await db.season.findFirst({ where: { name: NAME } });
  if (season) await db.season.delete({ where: { id: season.id } });
  const users = await db.user.findMany({ where: { email: { endsWith: DOMAIN } }, include: { player: true } });
  for (const u of users) {
    if (u.player) {
      await db.prediction.deleteMany({ where: { playerId: u.player.id } });
      await db.seasonPlayer.deleteMany({ where: { playerId: u.player.id } });
      await db.player.delete({ where: { id: u.player.id } });
    }
    await db.user.delete({ where: { id: u.id } });
  }
  console.error(`Torneo dimostrativo cancellato (${users.length} account)`);
}

async function create() {
  await remove();
  const clubs = await db.club.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const cus = clubs.find((c) => c.name.includes('CUS')) ?? clubs[0]!;

  const players: Player[] = [];
  for (const [first, last] of PLAYERS) {
    const user = await db.user.create({ data: { email: `demo-${first.toLowerCase()}${DOMAIN}` } });
    players.push(await db.player.create({ data: { firstName: first, lastName: last, shortName: first, userId: user.id } }));
  }
  const [andrea] = players;
  const ids = players.map((p) => p.id);
  const schedule = roundRobin(ids, 3);

  const season = await db.season.create({ data: { name: NAME, label: 'DEMO', qualifiers: 4, status: 'ACTIVE' } });
  await db.seasonPlayer.createMany({ data: ids.map((playerId, i) => ({ seasonId: season.id, playerId, seedOrder: i })) });
  await db.seasonClub.createMany({ data: clubs.map((c) => ({ seasonId: season.id, clubId: c.id })) });

  const matches = [];
  for (const [r, round] of schedule.entries()) {
    const startsOn = addDays(START, r * 7);
    const created = await db.round.create({ data: { seasonId: season.id, number: r + 1, startsOn, endsOn: addDays(startsOn, 6) } });
    for (const [i, [a, b]] of round.pairs.entries()) {
      matches.push(
        await db.match.create({
          data: { seasonId: season.id, roundId: created.id, code: `G${String(r + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, playerAId: a, playerBId: b },
          include: { round: true },
        }),
      );
    }
  }

  const andreaUser = andrea!.userId!;
  const userOf = (playerId: string) => players.find((p) => p.id === playerId)!.userId!;
  let other = 0;
  let andreaRound = 0;
  for (const m of matches) {
    const r = m.round.number;
    const withAndrea = m.playerAId === andrea!.id || m.playerBId === andrea!.id;
    const club = clubs[(hash(m.code) % clubs.length)]!;
    if (r <= ROUNDS_PLAYED) {
      // giocata a metà settimana alle 19, nel circolo "di casa" della coppia
      const day = addDays(m.round.startsOn, 1 + (hash(m.code) % 4));
      const at = fromRomeLocal(day, '19:00');
      let score = withAndrea ? ANDREA[andreaRound++]! : OTHERS[other++ % OTHERS.length]!;
      if (withAndrea && m.playerBId === andrea!.id) score = flip(score);
      // l'ultima di Andrea l'ha inserita l'avversario: in attesa della sua conferma (pagina Conferma)
      const pending = withAndrea && r === ROUNDS_PLAYED;
      const submitter = pending ? userOf(m.playerAId === andrea!.id ? m.playerBId : m.playerAId) : userOf(m.playerAId);
      await db.match.update({ where: { id: m.id }, data: { scheduledAt: at, clubId: club.id } });
      await db.matchResult.create({
        data: {
          matchId: m.id,
          set1A: score[0]![0],
          set1B: score[0]![1],
          set2A: score[1]![0],
          set2B: score[1]![1],
          stbA: score[2]?.[0] ?? null,
          stbB: score[2]?.[1] ?? null,
          status: pending ? 'PENDING' : 'CONFIRMED',
          submittedById: submitter,
          submittedAt: new Date(at.getTime() + 3 * 3_600_000),
          autoConfirmAt: pending ? new Date(Date.now() + 2 * 86_400_000) : null,
          confirmedAt: pending ? null : new Date(at.getTime() + 20 * 3_600_000),
        },
      });
    } else if (r === ROUNDS_PLAYED + 1) {
      // giornata in corso: Andrea gioca domani al CUS (meteo, simulatore), una partita programmata, le altre da programmare
      if (withAndrea) await db.match.update({ where: { id: m.id }, data: { scheduledAt: fromRomeLocal('2026-10-28', '18:00'), clubId: cus.id } });
      else if (m.code.endsWith('-02')) await db.match.update({ where: { id: m.id }, data: { scheduledAt: fromRomeLocal('2026-10-30', '20:00'), clubId: club.id } });
    }
  }

  // pronostici: sulle partite giocate quasi tutti votano, più spesso il vincitore giusto; nella giornata in corso votano gli altri
  for (const m of matches) {
    const r = m.round.number;
    if (r > ROUNDS_PLAYED + 1) continue;
    const result = await db.matchResult.findUnique({ where: { matchId: m.id } });
    const winnerA = result ? (result.stbA !== null ? result.stbA > result.stbB! : result.set1A! > result.set1B!) : true;
    for (const p of players) {
      if (p.id === m.playerAId || p.id === m.playerBId) continue;
      const h = hash(m.code + p.id);
      if (r === ROUNDS_PLAYED + 1 && p.id === andrea!.id && !m.code.endsWith('-02')) continue; // Andrea ha ancora da votare
      if (h % 6 === 0) continue; // qualcuno non vota
      const right = p.id === andrea!.id ? h % 5 !== 0 : h % 3 !== 0;
      const pickA = right === winnerA;
      await db.prediction.create({
        data: { matchId: m.id, playerId: p.id, pick: pickA ? 'A' : 'B', how: h % 2 ? 'TWO_SETS' : null },
      });
    }
  }

  const token = randomBytes(32).toString('base64url');
  await db.session.create({
    data: { userId: andreaUser, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000) },
  });
  console.error(`Torneo dimostrativo creato: ${players.length} giocatori, ${matches.length} partite`);
  // solo il token su stdout: lo legge lo script degli screenshot
  console.log(token);
}

const action = process.argv[2];
(action === 'create' ? create() : action === 'remove' ? remove() : Promise.reject(new Error('Uso: demo-guida.ts create|remove')))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
