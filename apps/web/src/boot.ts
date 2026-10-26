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

// Il cuore di public/loader.svg tocca terra ogni 0,675 secondi (due rimbalzi in 1,35)
const LANDING_S = 1.35 / 2;
const MIN_BOOT_S = 1;

/**
 * Prima pagina pronta: la schermata di avvio sfuma e poi sparisce.
 * Resta almeno 1 secondo, altrimenti si vedrebbe il cuore fermo dell'avvio nativo e poi un movimento di un attimo,
 * e sfuma solo quando il cuore tocca terra, mai a metà salto. Le chiamate successive non fanno niente.
 */
export function hideBoot() {
  const el = document.getElementById('boot');
  if (!el || el.dataset.leaving) return;
  el.dataset.leaving = '1';
  // l'animazione del loader parte quando l'immagine è scaricata
  const loaded = performance.getEntriesByName(new URL('/loader.svg', location.href).href)[0] as PerformanceResourceTiming | undefined;
  const now = (performance.now() - (loaded?.responseEnd ?? 0)) / 1000;
  const at = Math.ceil(Math.max(now, MIN_BOOT_S) / LANDING_S) * LANDING_S;
  setTimeout(() => {
    el.classList.add('boot-leaving');
    el.addEventListener('animationend', (e) => e.target === el && el.remove());
  }, (at - now) * 1000);
}
