import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { authPlugin } from './auth';
import { env } from './env';
import { startJobs } from './jobs';
import { adminRoutes } from './routes/admin';
import { adminPlayerRoutes } from './routes/admin-players';
import { matchRoutes } from './routes/matches';
import { seasonRoutes } from './routes/season';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'Dati non validi', issues: err.issues });
  }
  app.log.error(err);
  const status = err.statusCode ?? 500;
  return reply.code(status).send({ error: status < 500 ? err.message : 'Errore del server' });
});

await app.register(cookie);
await app.register(authPlugin);
await app.register(seasonRoutes);
await app.register(matchRoutes);
await app.register(adminRoutes);
await app.register(adminPlayerRoutes);

app.get('/api/health', async () => ({ ok: true }));

startJobs();
await app.listen({ host: '0.0.0.0', port: env.port });
