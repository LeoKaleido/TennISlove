import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

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
