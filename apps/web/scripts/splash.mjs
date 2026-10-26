// Schermate di avvio native di iPhone (public/splash): solo il colore di sfondo.
// iOS ammette solo immagini ferme: il cuore che rimbalza compare subito dopo, nella schermata di avvio di index.html.
// Uso: node scripts/splash.mjs  (se cambia il colore di sfondo; poi alza ?v= nei link di index.html)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// sharp arriva con @vite-pwa/assets-generator
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('@vite-pwa/assets-generator')] }));

const root = fileURLToPath(new URL('..', import.meta.url));
const BACKGROUND = '#0B1A24';

// dispositivi e file: dai link già presenti in index.html
const html = readFileSync(`${root}index.html`, 'utf8');
// ?v=N negli indirizzi: iPhone tiene in cache le immagini, cambiando la versione le riscarica
const files = [...html.matchAll(/href="\/splash\/(portrait-(\d+)x(\d+)\.png)(\?v=\d+)?"/g)];

for (const [, file, w, h] of files) {
  await sharp({ create: { width: Number(w), height: Number(h), channels: 3, background: BACKGROUND } })
    .png({ compressionLevel: 9 })
    .toFile(`${root}public/splash/${file}`);
}
console.log(`${files.length} schermate di avvio generate`);
