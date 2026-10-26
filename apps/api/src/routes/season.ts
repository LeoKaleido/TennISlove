import type { FastifyInstance } from 'fastify';
import { requireUser } from '../auth';
import { db } from '../db';
import { seasonOverview } from '../views';

export async function seasonRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser);

  app.get('/api/seasons', async () => {
    const seasons = await db.season.findMany({ where: { status: { not: 'DRAFT' } }, orderBy: { label: 'desc' } });
    return seasons.map((s) => ({ id: s.id, name: s.name, label: s.label, status: s.status }));
  });

  /** Stagione in corso, oppure ?id= per una stagione in archivio */
  app.get<{ Querystring: { id?: string } }>('/api/season', async (req, reply) => {
    const season = req.query.id
      ? await db.season.findUnique({ where: { id: req.query.id } })
      : await db.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
    // un torneo in preparazione lo vede solo l'admin, dal gestionale
    if (!season || (season.status === 'DRAFT' && !req.user!.isAdmin)) return reply.code(404).send({ error: 'Nessun torneo in corso' });
    return seasonOverview(season);
  });
}
