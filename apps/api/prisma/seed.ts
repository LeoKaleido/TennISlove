// Popola il database con il torneo 2026/27. Idempotente: se la stagione esiste non fa nulla.
// Uso: pnpm prisma db seed

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { ADMIN_ONLY_EMAILS, CLUBS, matchCode, PLAYERS, ROUNDS, SEASON, type SeedResult } from './seed-data';

const RESULTS: Record<string, SeedResult> = JSON.parse(readFileSync(new URL('./seed-results.json', import.meta.url), 'utf8'));

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.season.findFirst({ where: { label: SEASON.label } });
  if (existing) {
    console.log(`Stagione ${SEASON.label} già presente, seed saltato.`);
    return;
  }

  const season = await prisma.season.create({ data: { ...SEASON, status: 'ACTIVE' } });

  const playerIds = new Map<string, string>();
  for (const [i, p] of PLAYERS.entries()) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, isAdmin: 'isAdmin' in p && p.isAdmin },
    });
    const player = await prisma.player.create({
      data: { firstName: p.firstName, lastName: p.lastName, shortName: p.key, userId: user.id },
    });
    await prisma.seasonPlayer.create({ data: { seasonId: season.id, playerId: player.id, seedOrder: i } });
    playerIds.set(p.key, player.id);
  }
  for (const email of ADMIN_ONLY_EMAILS) {
    await prisma.user.upsert({ where: { email }, update: { isAdmin: true }, create: { email, isAdmin: true } });
  }

  for (const c of CLUBS) {
    const club = await prisma.club.create({ data: c });
    await prisma.seasonClub.create({ data: { seasonId: season.id, clubId: club.id } });
  }

  for (const [r, round] of ROUNDS.entries()) {
    const created = await prisma.round.create({
      data: {
        seasonId: season.id,
        number: r + 1,
        startsOn: round.startsOn,
        endsOn: round.endsOn,
        pauseAfter: round.pauseAfter ?? null,
      },
    });
    for (const [m, [a, b]] of round.matches.entries()) {
      const code = matchCode(r + 1, m + 1);
      const res = RESULTS[code];
      await prisma.match.create({
        data: {
          seasonId: season.id,
          roundId: created.id,
          code,
          playerAId: playerIds.get(a)!,
          playerBId: playerIds.get(b)!,
          result: res && {
            create: {
              timeExpired: res.timeExpired,
              set1A: res.set1?.a ?? null,
              set1B: res.set1?.b ?? null,
              set2A: res.set2?.a ?? null,
              set2B: res.set2?.b ?? null,
              stbA: res.stb?.a ?? null,
              stbB: res.stb?.b ?? null,
              status: 'CONFIRMED',
              confirmedAt: new Date(),
            },
          },
        },
      });
    }
  }

  console.log(`Seed completato: ${PLAYERS.length} giocatori, ${ROUNDS.length} giornate, ${Object.keys(RESULTS).length} risultati.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
