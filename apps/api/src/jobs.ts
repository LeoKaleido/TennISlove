// Lavori periodici. Per ora: conferma automatica dei risultati dopo X giorni (D-010, D-016).

import { audit, db } from './db';

export async function autoConfirmResults(now = new Date()) {
  const due = await db.matchResult.findMany({ where: { status: 'PENDING', autoConfirmAt: { lte: now } } });
  for (const r of due) {
    await db.matchResult.update({
      where: { matchId: r.matchId },
      data: { status: 'CONFIRMED', confirmedAt: now, confirmedAutomatically: true },
    });
    await audit(null, 'MatchResult', r.matchId, 'auto-confirm');
  }
  return due.length;
}

export function startJobs() {
  const run = () => autoConfirmResults().catch((e) => console.error('Conferma automatica fallita', e));
  run();
  return setInterval(run, 5 * 60_000);
}
