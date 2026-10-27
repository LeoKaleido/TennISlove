import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { authPlugin } from './auth';
import { env } from './env';
import { startJobs } from './jobs';
import { adminRoutes } from './routes/admin';
import { adminPlayerRoutes } from './routes/admin-players';
import { adminSeasonRoutes } from './routes/admin-seasons';
import { matchRoutes } from './routes/matches';
import { photoRoutes } from './routes/photos';
import { seasonRoutes } from './routes/season';
import { locateMissingClubs } from './weather';

// trustProxy: in produzione davanti c'è Nginx, così nei log compare l'IP vero del client
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: env.trustProxy });

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
await app.register(photoRoutes);
await app.register(adminRoutes);
await app.register(adminPlayerRoutes);
await app.register(adminSeasonRoutes);

app.get('/api/health', async () => ({ ok: true }));

startJobs();
await app.listen({ host: '0.0.0.0', port: env.port });
// posizione dei circoli per il meteo (D-065), senza far aspettare l'avvio
locateMissingClubs((msg) => app.log.info(msg)).catch((e) => app.log.warn({ err: e }, 'Posizione dei circoli non ricavata'));
