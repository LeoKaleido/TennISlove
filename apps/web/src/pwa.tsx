// App installabile (D-048): aggiornamenti, installazione, ritorno alla pagina dopo una chiusura.

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Aperta come app installata (icona sulla Home), non nel browser */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent));

/** Chrome su iPhone/iPad: stesso motore di Safari, ma il pulsante Condividi è in alto a destra */
export const isChromeIOS = () => /crios/i.test(navigator.userAgent);

/** iPhone/iPad con il menu Condividi a disposizione delle pagine: il pulsante Installa lo apre */
const canShareToInstall = () => isIOS() && typeof navigator.share === 'function';

/**
 * Come installare su iPhone/iPad, dove nessun sito può avviare l'installazione: il pulsante apre il menu Condividi
 * (con dentro «Aggiungi alla schermata Home»); senza, si dice dove trovarlo
 */
export const iosInstallHint = () =>
  canShareToInstall()
    ? 'Nel menu che si apre scegli «Aggiungi alla schermata Home» (se non lo vedi, scorri il menu verso il basso).'
    : isChromeIOS()
      ? 'Tocca Condividi in alto a destra, poi «Aggiungi alla schermata Home».'
      : 'Tocca Condividi, poi «Aggiungi alla schermata Home».';

/** Apre il menu Condividi dell'iPhone: va chiamato dal tocco sul pulsante */
async function shareToInstall() {
  try {
    await navigator.share({ title: 'TennIsLove', url: `${location.origin}/` });
  } catch {
    // menu chiuso senza scegliere: niente da fare
  }
}

/** Telefono o tablet (anche iPad, che si presenta come Mac) */
export const isMobileDevice = () => isIOS() || /android/i.test(navigator.userAgent);

/**
 * Nuova versione pubblicata: si controlla all'avvio, quando l'app torna in primo piano e ogni ora.
 * Se l'utente sta usando l'app compare "Aggiorna"; se l'app va in background, si aggiorna da sola.
 * Le bozze dei form sono salvate (drafts.ts), quindi ricaricare non fa perdere niente.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => undefined);
      setInterval(check, 60 * 60_000);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    const onHide = () => document.visibilityState === 'hidden' && updateServiceWorker(true);
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;
  return (
    <div className="update-bar" role="status">
      <span>Nuova versione</span>
      <button onClick={() => updateServiceWorker(true)}>Aggiorna</button>
    </div>
  );
}

const LAST_ROUTE = 'tennislove:lastRoute';
const RESUME_WITHIN_MS = 12 * 60 * 60_000;
const NOT_RESUMABLE = ['/login'];

/**
 * Se il telefono chiude l'app in background, alla riapertura si riparte dalla Home:
 * qui si torna all'ultima pagina vista, se è di meno di 12 ore fa.
 */
export function useResumeRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);

  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      try {
        const saved = JSON.parse(localStorage.getItem(LAST_ROUTE) ?? 'null') as { path: string; at: number } | null;
        if (isStandalone() && location.pathname === '/' && saved && saved.path !== '/' && Date.now() - saved.at < RESUME_WITHIN_MS) {
          navigate(saved.path, { replace: true });
          return;
        }
      } catch {
        // storage non disponibile: si resta dove si è
      }
    }
    if (NOT_RESUMABLE.includes(location.pathname)) return;
    try {
      localStorage.setItem(LAST_ROUTE, JSON.stringify({ path: location.pathname + location.search, at: Date.now() }));
    } catch {
      // niente da fare
    }
  }, [location, navigate]);
}

/** Evento beforeinstallprompt (Chrome, Edge, Samsung Internet su Android; Safari e iOS non lo supportano) */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Android e Chrome offrono l'installazione con un evento che arriva presto: lo si tiene da parte
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as InstallPromptEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((l) => l());
});

/** La finestra di sistema si può aprire una volta sola: dopo la scelta l'evento non vale più (MDN) */
async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  deferredPrompt = null;
  listeners.forEach((l) => l());
}

/**
 * Installazione: su Android si apre il prompt di sistema; su iPhone `share` apre il menu Condividi
 * e i passi (`iosInstallHint`) dicono cosa scegliere
 */
export function useInstall() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    available: !isStandalone() && (!!deferredPrompt || isIOS()),
    prompt: deferredPrompt ? promptInstall : null,
    share: !deferredPrompt && canShareToInstall() ? shareToInstall : null,
  };
}
