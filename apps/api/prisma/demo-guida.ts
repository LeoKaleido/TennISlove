// Tornei dimostrativi per gli screenshot della guida (D-067): giocatori inventati, risultati verosimili.
// Uso, dentro il container di sviluppo (vedi scripts/guida/README.md o la skill aggiorna-guida):
//   tsx prisma/demo-guida.ts create   crea i tornei e stampa il token di sessione di Andrea
//   tsx prisma/demo-guida.ts remove   cancella tornei, giocatori e account dimostrativi
// Due tornei: uno concluso un anno fa (campione, podio, scelta del torneo) e uno in corso, con oggi nella quarta giornata.
// Finché esiste, quello in corso è il torneo dell'app e tra i tornei da scegliere ci sono solo i dimostrativi: solo in sviluppo.

import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient, type Club, type Player } from '@prisma/client';
import { addDays, computeStandings, DEMO_SEASON_NAME, fromRomeLocal, romeDay, roundRobin, type StandingsMatch } from '@tentennis/shared';

const db = new PrismaClient();
const NAME = DEMO_SEASON_NAME;
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

/** Torneo in corso: giornate giocate prima di quella di questa settimana */
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
/** Andrea nel torneo in corso: un 6-0 (Cappotto), una rimonta (Rimonta), tre vittorie di fila (Tris) */
const ANDREA: Score[] = [
  [[6, 0], [6, 3]],
  [[4, 6], [6, 3], [10, 7]],
  [[6, 4], [6, 2]],
];
/** Andrea nel torneo concluso: quasi sempre vincente, per il podio */
const ANDREA_PAST: Score[] = [
  [[6, 2], [6, 3]],
  [[6, 4], [7, 5]],
  [[3, 6], [4, 6]],
  [[6, 1], [6, 4]],
  [[7, 6], [3, 6], [10, 6]],
  [[6, 3], [6, 2]],
  [[6, 4], [6, 4]],
];

const flip = (s: Score): Score => s.map(([a, b]) => [b, a]);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const scoreInput = (s: Score) => ({ timeExpired: false, set1: { a: s[0]![0], b: s[0]![1] }, set2: { a: s[1]![0], b: s[1]![1] }, stb: s[2] ? { a: s[2][0], b: s[2][1] } : null });
const resultData = (s: Score) => ({
  set1A: s[0]![0],
  set1B: s[0]![1],
  set2A: s[1]![0],
  set2B: s[1]![1],
  stbA: s[2]?.[0] ?? null,
  stbB: s[2]?.[1] ?? null,
});

/** Lunedì della settimana di un giorno (YYYY-MM-DD) */
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));

async function remove() {
  await db.season.deleteMany({ where: { name: NAME } });
  const users = await db.user.findMany({ where: { email: { endsWith: DOMAIN } }, include: { player: true } });
  for (const u of users) {
    if (u.player) {
      await db.prediction.deleteMany({ where: { playerId: u.player.id } });
      await db.seasonPlayer.deleteMany({ where: { playerId: u.player.id } });
      await db.player.delete({ where: { id: u.player.id } });
    }
    await db.user.delete({ where: { id: u.id } });
  }
  console.error(`Tornei dimostrativi cancellati (${users.length} account)`);
}

/** Torneo con calendario completo; le partite si restituiscono con la loro giornata */
async function season(label: string, status: 'ACTIVE' | 'ARCHIVED', start: string, ids: string[], clubs: Club[], seed: number) {
  const s = await db.season.create({ data: { name: NAME, label, subtitle: 'Amici del tennis, il giovedì sera', qualifiers: 4, status } });
  await db.seasonPlayer.createMany({ data: ids.map((playerId, i) => ({ seasonId: s.id, playerId, seedOrder: i })) });
  await db.seasonClub.createMany({ data: clubs.map((c) => ({ seasonId: s.id, clubId: c.id })) });
  const matches = [];
  for (const [r, round] of roundRobin(ids, seed).entries()) {
    const startsOn = addDays(start, r * 7);
    const created = await db.round.create({ data: { seasonId: s.id, number: r + 1, startsOn, endsOn: addDays(startsOn, 6) } });
    for (const [i, [a, b]] of round.pairs.entries()) {
      matches.push(
        await db.match.create({
          data: { seasonId: s.id, roundId: created.id, code: `G${String(r + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, playerAId: a, playerBId: b },
          include: { round: true },
        }),
      );
    }
  }
  return { season: s, matches };
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
  const andrea = players[0]!;
  // Andrea è iscritto da due anni e qualche mese: nella guida il badge Veterano ha un livello e mezzo anno da fare
  await db.player.update({ where: { id: andrea.id }, data: { memberSince: addDays(romeDay(new Date()), -(2 * 365 + 120)) } });
  const ids = players.map((p) => p.id);
  const userOf = (playerId: string) => players.find((p) => p.id === playerId)!.userId!;
  const withAndrea = (m: { playerAId: string; playerBId: string }) => m.playerAId === andrea.id || m.playerBId === andrea.id;

  // date da oggi: la settimana in corso è la quarta giornata del torneo in corso
  const today = romeDay(new Date());
  const start = addDays(mondayOf(today), -7 * ROUNDS_PLAYED);
  const year = new Date(`${today}T12:00:00Z`).getUTCFullYear();
  const pastLabel = `${year - 1}/${String(year).slice(2)}`;
  const label = `${year}/${String(year + 1).slice(2)}`;

  // ---- torneo concluso un anno fa: tutte le giornate giocate, campione dalla classifica

  const past = await season(pastLabel, 'ARCHIVED', mondayOf(addDays(start, -364)), ids, clubs, 7);
  const played: StandingsMatch[] = [];
  let k = 0;
  let a = 0;
  for (const m of past.matches) {
    let score = withAndrea(m) ? ANDREA_PAST[a++]! : OTHERS[(k++ * 3) % OTHERS.length]!;
    if (withAndrea(m) && m.playerBId === andrea.id) score = flip(score);
    const at = fromRomeLocal(addDays(m.round.startsOn, 1 + (hash(m.code) % 4)), '19:00');
    await db.match.update({ where: { id: m.id }, data: { scheduledAt: at, clubId: clubs[hash(m.code) % clubs.length]!.id } });
    await db.matchResult.create({
      data: { matchId: m.id, ...resultData(score), status: 'CONFIRMED', submittedById: userOf(m.playerAId), submittedAt: at, confirmedAt: at },
    });
    played.push({ playerAId: m.playerAId, playerBId: m.playerBId, score: scoreInput(score) });
  }
  const champion = computeStandings(ids, played, { qualifiers: 4 })[0]!.playerId;
  await db.season.update({ where: { id: past.season.id }, data: { championPlayerId: champion } });

  // ---- torneo in corso

  const { matches } = await season(label, 'ACTIVE', start, ids, clubs, 3);
  let other = 0;
  let andreaRound = 0;
  for (const m of matches) {
    const r = m.round.number;
    const club = clubs[hash(m.code) % clubs.length]!;
    if (r <= ROUNDS_PLAYED) {
      // giocata a metà settimana alle 19, nel circolo "di casa" della coppia
      const at = fromRomeLocal(addDays(m.round.startsOn, 1 + (hash(m.code) % 4)), '19:00');
      let score = withAndrea(m) ? ANDREA[andreaRound++]! : OTHERS[other++ % OTHERS.length]!;
      if (withAndrea(m) && m.playerBId === andrea.id) score = flip(score);
      // l'ultima di Andrea l'ha inserita l'avversario: in attesa della sua conferma (pagina Conferma)
      const pending = withAndrea(m) && r === ROUNDS_PLAYED;
      const submitter = pending ? userOf(m.playerAId === andrea.id ? m.playerBId : m.playerAId) : userOf(m.playerAId);
      await db.match.update({ where: { id: m.id }, data: { scheduledAt: at, clubId: club.id } });
      await db.matchResult.create({
        data: {
          matchId: m.id,
          ...resultData(score),
          status: pending ? 'PENDING' : 'CONFIRMED',
          submittedById: submitter,
          submittedAt: new Date(at.getTime() + 3 * 3_600_000),
          autoConfirmAt: pending ? new Date(Date.now() + 2 * 86_400_000) : null,
          confirmedAt: pending ? null : new Date(at.getTime() + 20 * 3_600_000),
        },
      });
    } else if (r === ROUNDS_PLAYED + 1) {
      // giornata in corso: Andrea gioca domani al CUS (meteo, simulatore), una partita programmata, le altre da programmare.
      // Di domenica "domani" sarebbe la settimana dopo: si gioca stasera
      const endsOn = m.round.endsOn;
      const tomorrow = addDays(today, 1);
      const andreaAt = tomorrow <= endsOn ? fromRomeLocal(tomorrow, '18:00') : fromRomeLocal(today, '21:00');
      const otherDay = addDays(today, 3) <= endsOn ? addDays(today, 3) : endsOn;
      if (withAndrea(m)) await db.match.update({ where: { id: m.id }, data: { scheduledAt: andreaAt, clubId: cus.id } });
      else if (m.code.endsWith('-02')) await db.match.update({ where: { id: m.id }, data: { scheduledAt: fromRomeLocal(otherDay, '20:00'), clubId: club.id } });
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
      if (r === ROUNDS_PLAYED + 1 && p.id === andrea.id && !m.code.endsWith('-02')) continue; // Andrea ha ancora da votare
      if (h % 6 === 0) continue; // qualcuno non vota
      const right = p.id === andrea.id ? h % 5 !== 0 : h % 3 !== 0;
      await db.prediction.create({
        data: { matchId: m.id, playerId: p.id, pick: right === winnerA ? 'A' : 'B', how: h % 2 ? 'TWO_SETS' : null },
      });
    }
  }

  const token = randomBytes(32).toString('base64url');
  await db.session.create({
    data: { userId: andrea.userId!, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000) },
  });
  console.error(`Tornei dimostrativi creati: ${pastLabel} (concluso) e ${label} (in corso), ${players.length} giocatori`);
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
