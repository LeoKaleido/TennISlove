// Bozze dei form salvate sul telefono: se l'app viene chiusa in background o si aggiorna,
// alla riapertura il form torna com'era. Valgono 24 ore e si cancellano all'invio.

const PREFIX = 'tennislove:draft:';
const TTL_MS = 24 * 60 * 60_000;

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - at > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // storage pieno o non disponibile: la bozza semplicemente non si salva
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // niente da fare
  }
}

/** All'uscita: niente bozze né ultima pagina lasciate sul telefono */
export function clearLocalData() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('tennislove:')) localStorage.removeItem(key);
  } catch {
    // niente da fare
  }
}
