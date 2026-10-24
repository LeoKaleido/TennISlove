// File caricati (foto delle partite e dei profili) su disco, nella cartella UPLOAD_DIR.
// Sul VPS la cartella è un volume Docker incluso nel backup.

import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from './env';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXTENSIONS).map(([m, e]) => [e, m]));

export const isAllowedImage = (mime: string) => mime in EXTENSIONS;

/** Chiave relativa, es. "photos/abc.jpg" */
export const storageKey = (folder: 'photos' | 'players', id: string, mime: string) => `${folder}/${id}.${EXTENSIONS[mime]}`;

const fullPath = (key: string) => {
  const p = path.resolve(env.uploadDir, key);
  if (!p.startsWith(path.resolve(env.uploadDir) + path.sep)) throw new Error('Percorso non valido');
  return p;
};

export async function saveFile(key: string, data: Buffer) {
  const p = fullPath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, data);
}

export async function removeFile(key: string) {
  await rm(fullPath(key), { force: true });
}

export async function openFile(key: string) {
  const p = fullPath(key);
  const info = await stat(p).catch(() => null);
  if (!info) return null;
  const mime = MIME[path.extname(p).slice(1)] ?? 'application/octet-stream';
  return { stream: createReadStream(p), size: info.size, mime };
}
