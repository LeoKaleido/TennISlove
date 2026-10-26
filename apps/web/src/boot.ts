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

/** La schermata di avvio sfuma una sola volta, alla prima apertura */
let splashFaded = false;
export function useSplashFade() {
  const [show] = useState(() => !splashFaded);
  useEffect(() => {
    splashFaded = true;
  }, []);
  return show;
}
