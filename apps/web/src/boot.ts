// Avvio senza scatti: la schermata di avvio resta finché ci sono login, dati del torneo e font.
// Senza attendere i font, il testo comparirebbe col font di sistema e poi cambierebbe forma.

import { useEffect, useState } from 'react';

let fontsReady = false;
const fonts = Promise.race([
  Promise.all(['400 16px Archivo', '800 16px Archivo', '500 16px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
  // con una rete lenta non si aspetta oltre: meglio il font di sistema che una schermata ferma
  new Promise((resolve) => setTimeout(resolve, 1500)),
])
  .catch(() => undefined)
  .then(() => {
    fontsReady = true;
  });

export function useFontsReady() {
  const [ready, setReady] = useState(fontsReady);
  useEffect(() => {
    if (!ready) void fonts.then(() => setReady(true));
  }, [ready]);
  return ready;
}

/** La schermata di avvio di index.html (#boot) è ancora sullo schermo? */
export const bootVisible = () => !!document.getElementById('boot');

/**
 * Immagine della schermata di avvio, solo all'apertura dell'app: le attese successive (Splash, caricamenti) usano il cuore, public/loader.svg.
 * È il loader delle palline, generato da scripts/avvio/genera.mjs. Cambiandola, aggiorna anche `src` di #boot in index.html.
 */
export const BOOT_IMAGE = '/avvio.svg';

/**
 * Durata di un giro dell'animazione di avvio, in secondi: la schermata sfuma solo alla fine di un giro, mai a metà.
 * null = sfuma appena l'app è pronta (le palline girano in 6 s: aspettare la fine del giro sarebbe troppo).
 */
const BOOT_LOOP_S: number | null = null;
/** Durata minima della schermata di avvio, da quando l'animazione parte */
const MIN_BOOT_S = 1.5;

/**
 * Prima pagina pronta: la schermata di avvio sfuma e poi sparisce.
 * Resta almeno 1,5 secondi (MIN_BOOT_S): le palline fanno in tempo a colpire, e non si vede un movimento di un attimo,
 * e sfuma alla fine di un giro dell'animazione (BOOT_LOOP_S), mai a metà. Le chiamate successive non fanno niente.
 */
export function hideBoot() {
  const el = document.getElementById('boot');
  if (!el || el.dataset.leaving) return;
  el.dataset.leaving = '1';
  // l'animazione dell'immagine parte quando l'immagine è scaricata
  const loaded = performance.getEntriesByName(new URL(BOOT_IMAGE, location.href).href)[0] as PerformanceResourceTiming | undefined;
  const now = (performance.now() - (loaded?.responseEnd ?? 0)) / 1000;
  const at = BOOT_LOOP_S ? Math.ceil(Math.max(now, MIN_BOOT_S) / BOOT_LOOP_S) * BOOT_LOOP_S : Math.max(now, MIN_BOOT_S);
  setTimeout(() => {
    el.classList.add('boot-leaving');
    el.addEventListener('animationend', (e) => e.target === el && el.remove());
  }, (at - now) * 1000);
}
