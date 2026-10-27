import { PrismaClient } from '@prisma/client';
import { DEMO_SEASON_NAME } from '@tentennis/shared';

export const db = new PrismaClient();

/** Il torneo in corso; tra un torneo e l'altro l'ultimo concluso, così l'app non resta vuota */
export async function currentSeason() {
  return (
    (await db.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } })) ??
    (await db.season.findFirst({ where: { status: 'ARCHIVED', name: { not: DEMO_SEASON_NAME } }, orderBy: { createdAt: 'desc' } }))
  );
}

export async function audit(
  actorId: string | null,
  entity: string,
  entityId: string,
  action: string,
  before: unknown = null,
  after: unknown = null,
) {
  await db.auditLog.create({
    data: {
      actorId,
      entity,
      entityId,
      action,
      before: before === null ? undefined : (before as object),
      after: after === null ? undefined : (after as object),
    },
  });
}
