// Screenshot della guida (D-067): Chrome senza finestra, pilotato con il protocollo DevTools, sul torneo dimostrativo.
// Uso: node scripts/guida/screenshots.mjs <file con il token di sessione> [cartella di uscita]
// Vedi scripts/guida/README.md. Richiede l'app di sviluppo su http://localhost:5173 e Google Chrome.

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [tokenFile, outDir = 'apps/web/public/guida'] = process.argv.slice(2);
if (!tokenFile) throw new Error('Uso: node scripts/guida/screenshots.mjs <file-token> [cartella]');
const token = readFileSync(tokenFile, 'utf8').trim();
const BASE = 'http://localhost:5173';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Chrome e protocollo DevTools

const profile = mkdtempSync(join(tmpdir(), 'guida-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
      return target.webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Chrome non risponde');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
/** Aspetta che un'espressione nella pagina diventi vera */
const waitFor = async (expression, ms = 8000) => {
  for (let t = 0; t < ms; t += 100) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Non trovato: ${expression}`);
};

await send('Page.enable');
await send('Network.enable');
await send('Network.setCookie', { name: 'atp_session', value: token, domain: 'localhost', path: '/', httpOnly: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

const go = async (path) => {
  await send('Page.navigate', { url: BASE + path });
  // l'app compare dopo i font e la schermata di avvio
  await waitFor(`document.querySelector('.screen') && !document.getElementById('boot') && !document.querySelector('[aria-busy="true"]')`, 15000);
  await sleep(900);
};

// ---- aiuti nella pagina: sezione da titolo, riquadro di un elemento

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__section = (title) => {
      // il titolo può avere accanto il punto interrogativo della guida
      const h = [...document.querySelectorAll('h2')].find((x) => x.firstChild?.textContent.trim() === title);
      return h && h.closest('.section-head').parentElement;
    };
    window.__rect = (el, pad = 0) => {
      const r = el.getBoundingClientRect();
      // mai oltre i bordi dello schermo: fuori dalla pagina Chrome disegna una striscia grigia
      const x = Math.max(0, r.left + scrollX - pad);
      const right = Math.min(document.documentElement.clientWidth, r.right + scrollX + pad);
      return { x, y: Math.max(0, r.top + scrollY - pad), width: right - x, height: r.height + 2 * pad };
    };
  `,
});

const shot = async (name, clipExpr) => {
  // nei ritagli di una sezione la barra in basso (fissa) finirebbe sopra il contenuto
  await evaluate(`document.querySelectorAll('.dock').forEach((d) => (d.style.visibility = ${clipExpr ? "'hidden'" : "''"}))`);
  const clip = clipExpr ? await evaluate(clipExpr) : { x: 0, y: 0, width: 390, height: 844 };
  if (!clip) throw new Error(`${name}: elemento non trovato`);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78, clip: { ...clip, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(join(outDir, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`${name}.jpg`);
};
const click = (expr) => evaluate(`(${expr}).click()`);

// ---- dati del torneo dimostrativo

await go('/');
const info = await evaluate(`(async () => {
  const s = await fetch('/api/season').then((r) => r.json());
  const me = await fetch('/api/me').then((r) => r.json());
  const mine = s.matches.filter((m) => m.playerAId === me.playerId || m.playerBId === me.playerId);
  const next = mine.find((m) => !m.result);
  const toConfirm = mine.find((m) => m.result && m.result.status === 'PENDING');
  const opp = (m) => (m.playerAId === me.playerId ? m.playerBId : m.playerAId);
  return { me: me.playerId, next: next.id, toConfirm: toConfirm.id, rival: opp(toConfirm) };
})()`);

try {
  await shot('home');

  await go(`/partite/${info.next}`);
  await shot('partita');
  await shot('meteo', `__rect(document.querySelector('.weather'), 10)`);
  await shot('simulatore', `__rect(__section('Cosa ti serve'), 8)`);
  await click(`document.querySelector('.sim-row')`);
  await sleep(600);
  await shot('simulatore-dettaglio', `__rect(__section('Cosa ti serve'), 8)`);

  await go(`/partite/${info.next}?programma=1`);
  await waitFor(`document.querySelector('.sheet')`);
  await sleep(500);
  await shot('programma');

  await go(`/partite/${info.next}/risultato`);
  await shot('risultato');

  await go(`/partite/${info.toConfirm}/conferma`);
  await shot('conferma');

  await go('/calendario');
  await shot('calendario');

  await go('/classifica');
  await shot('classifica');

  await go('/pronostici');
  await shot('pronostici');

  await go('/classifica?vista=pronostici');
  await shot('classifica-pronostici');

  await go('/profilo');
  await shot('profilo');
  await shot('andamento', `__rect(__section('Andamento in classifica'), 8)`);
  await click(`document.querySelector('.badge-tile:not(:has(.locked))')`);
  await sleep(600);
  await shot('badge', `__rect(__section('Badge'), 8)`);

  await click(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Condividi la tua card'))`);
  await waitFor(`document.querySelector('.modal img')?.complete`, 15000);
  await sleep(500);
  await shot('card', `__rect(document.querySelector('.modal'), 0)`);

  await go('/profilo');
  await click(`document.querySelector('[aria-label="Impostazioni"]')`);
  await waitFor(`document.querySelector('.sheet')`);
  await sleep(500);
  await shot('impostazioni');

  await go(`/confronto/${info.me}/${info.rival}`);
  await shot('testa-a-testa');
  await shot('avversari-comuni', `__rect(__section('Avversari in comune') ?? __section('Numeri a confronto'), 8)`);
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
