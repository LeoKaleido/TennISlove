// Foto delle partite (selfie, gallery, copertina) e foto profilo dei giocatori.

import multipart from '@fastify/multipart';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth';
import { audit, currentSeason, db } from '../db';
import { detectImage, isAllowedImage, MAX_UPLOAD_BYTES, openFile, removeFile, saveFile, storageKey } from '../storage';

/** Tetto per partita: evita che il disco si riempia */
const MAX_PHOTOS_PER_MATCH = 30;

/** Legge l'unica immagine del form multipart */
async function readImage(req: FastifyRequest, reply: FastifyReply) {
  const file = await req.file();
  if (!file) {
    reply.code(400).send({ error: 'Nessuna foto ricevuta' });
    return null;
  }
  if (!isAllowedImage(file.mimetype)) {
    reply.code(400).send({ error: 'Formato non supportato: usa JPEG, PNG o WebP' });
    return null;
  }
  const data = await file.toBuffer().catch(() => null);
  if (!data) {
    reply.code(413).send({ error: 'Foto troppo grande (massimo 8 MB)' });
    return null;
  }
  const mime = detectImage(data);
  if (!mime) {
    reply.code(400).send({ error: 'Il file non è una foto valida' });
    return null;
  }
  return { data, mime };
}

async function sendStored(reply: FastifyReply, key: string | null | undefined) {
  const file = key ? await openFile(key) : null;
  if (!file) return reply.code(404).send({ error: 'Foto non trovata' });
  return reply
    .header('Content-Type', file.mime)
    .header('Content-Length', file.size)
    .header('X-Content-Type-Options', 'nosniff')
    .header('Cache-Control', 'private, max-age=31536000, immutable')
    .send(file.stream);
}

export async function photoRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
  app.addHook('preHandler', requireUser);

  app.get<{ Params: { id: string } }>('/api/photos/:id', async (req, reply) => {
    const photo = await db.matchPhoto.findUnique({ where: { id: req.params.id } });
    return sendStored(reply, photo?.storageKey);
  });

  app.get<{ Params: { id: string } }>('/api/players/:id/photo', async (req, reply) => {
    const player = await db.player.findUnique({ where: { id: req.params.id } });
    return sendStored(reply, player?.photoKey);
  });

  /** Gallery della stagione in corso (o ?season=) */
  app.get<{ Querystring: { season?: string } }>('/api/gallery', async (req) => {
    const season = req.query.season ? await db.season.findUnique({ where: { id: req.query.season } }) : await currentSeason();
    if (!season || (season.status === 'DRAFT' && !req.user!.isAdmin)) return { photos: [] };
    const photos = await db.matchPhoto.findMany({
      where: { match: { seasonId: season.id } },
      include: { match: { select: { id: true, playerAId: true, playerBId: true, round: { select: { number: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      photos: photos.map((p) => ({
        id: p.id,
        url: `/api/photos/${p.id}`,
        createdAt: p.createdAt.toISOString(),
        uploadedById: p.uploadedById,
        matchId: p.match.id,
        round: p.match.round.number,
        playerAId: p.match.playerAId,
        playerBId: p.match.playerBId,
      })),
    };
  });

  /** Carica una foto della partita: solo i due giocatori. La prima diventa la copertina. */
  app.post<{ Params: { id: string } }>('/api/matches/:id/photos', async (req, reply) => {
    const user = req.user!;
    const match = await db.match.findUnique({ where: { id: req.params.id }, include: { season: true } });
    if (!match) return reply.code(404).send({ error: 'Partita non trovata' });
    if (user.playerId !== match.playerAId && user.playerId !== match.playerBId) {
      return reply.code(403).send({ error: 'Puoi caricare foto solo delle tue partite' });
    }
    if (match.season.status !== 'ACTIVE') return reply.code(409).send({ error: 'Il torneo non è in corso' });
    if ((await db.matchPhoto.count({ where: { matchId: match.id } })) >= MAX_PHOTOS_PER_MATCH) {
      return reply.code(409).send({ error: `Massimo ${MAX_PHOTOS_PER_MATCH} foto per partita` });
    }
    const image = await readImage(req, reply);
    if (!image) return;

    const photo = await db.matchPhoto.create({ data: { matchId: match.id, uploadedById: user.id, storageKey: 'pending' } });
    const key = storageKey('photos', photo.id, image.mime);
    await saveFile(key, image.data);
    await db.matchPhoto.update({ where: { id: photo.id }, data: { storageKey: key } });
    if (!match.coverPhotoId) await db.match.update({ where: { id: match.id }, data: { coverPhotoId: photo.id } });
    await audit(user.id, 'MatchPhoto', photo.id, 'upload', null, { matchId: match.id });
    return { ok: true, photoId: photo.id, url: `/api/photos/${photo.id}` };
  });

  app.put<{ Params: { id: string } }>('/api/matches/:id/cover', async (req, reply) => {
    const { photoId } = z.object({ photoId: z.string() }).parse(req.body);
    const user = req.user!;
    const match = await db.match.findUnique({ where: { id: req.params.id } });
    if (!match) return reply.code(404).send({ error: 'Partita non trovata' });
    if (user.playerId !== match.playerAId && user.playerId !== match.playerBId && !user.isAdmin) {
      return reply.code(403).send({ error: 'Solo i giocatori della partita possono scegliere la copertina' });
    }
    const photo = await db.matchPhoto.findFirst({ where: { id: photoId, matchId: match.id } });
    if (!photo) return reply.code(404).send({ error: 'Foto non trovata' });
    await db.match.update({ where: { id: match.id }, data: { coverPhotoId: photo.id } });
    return { ok: true };
  });

  /** Cancella una foto: chi l'ha caricata o un amministratore */
  app.delete<{ Params: { id: string } }>('/api/photos/:id', async (req, reply) => {
    const user = req.user!;
    const photo = await db.matchPhoto.findUnique({ where: { id: req.params.id }, include: { coverOf: true } });
    if (!photo) return reply.code(404).send({ error: 'Foto non trovata' });
    if (photo.uploadedById !== user.id && !user.isAdmin) return reply.code(403).send({ error: 'Puoi cancellare solo le tue foto' });
    if (photo.coverOf) {
      const next = await db.matchPhoto.findFirst({ where: { matchId: photo.matchId, id: { not: photo.id } }, orderBy: { createdAt: 'asc' } });
      await db.match.update({ where: { id: photo.matchId }, data: { coverPhotoId: next?.id ?? null } });
    }
    await db.matchPhoto.delete({ where: { id: photo.id } });
    await removeFile(photo.storageKey);
    await audit(user.id, 'MatchPhoto', photo.id, 'delete', { matchId: photo.matchId });
    return { ok: true };
  });

  /** Foto profilo: ogni giocatore carica la propria (D-020) */
  app.post('/api/me/photo', async (req, reply) => {
    const user = req.user!;
    if (!user.playerId) return reply.code(403).send({ error: 'Solo i giocatori hanno una foto profilo' });
    const image = await readImage(req, reply);
    if (!image) return;
    const player = await db.player.findUnique({ where: { id: user.playerId } });
    // nome nuovo a ogni caricamento, così la cache del browser non mostra la foto vecchia
    const key = storageKey('players', `${user.playerId}-${Date.now()}`, image.mime);
    await saveFile(key, image.data);
    await db.player.update({ where: { id: user.playerId }, data: { photoKey: key } });
    if (player?.photoKey) await removeFile(player.photoKey);
    return { ok: true };
  });
}
