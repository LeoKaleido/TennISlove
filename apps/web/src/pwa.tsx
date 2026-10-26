// App installabile (D-048): aggiornamenti, installazione, ritorno alla pagina dopo una chiusura.

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Aperta come app installata (icona sulla Home), non nel browser */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

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

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
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

/** Installazione: su Android si apre il prompt di sistema, su iPhone si mostrano i passi da fare */
export function useInstall() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    available: !isStandalone() && (!!deferredPrompt || isIOS()),
    prompt: deferredPrompt ? () => deferredPrompt!.prompt() : null,
  };
}
