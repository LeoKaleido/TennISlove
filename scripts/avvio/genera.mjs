// Schermata di avvio (public/avvio.svg) dal loader "palline" (brain/sources/loader-palline.html).
// Il loader originale muove tutto con uno script a ogni fotogramma; nella schermata di avvio serve un'immagine
// che si muova da sola (un'immagine ha un orologio suo, mentre la pagina è occupata a caricare l'app).
// Qui si eseguono gli stessi calcoli fotogramma per fotogramma e si scrivono come animazioni CSS e SMIL dentro l'SVG.
//
// Uso: node scripts/avvio/genera.mjs [file html] [file svg]
// Richiede macOS (sips) per rimpicciolire le immagini incorporate.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [src = 'brain/sources/loader-palline.html', out = 'apps/web/public/avvio.svg'] = process.argv.slice(2);

/** Velocità rispetto all'originale: 1,6 = un giro di 8 palline in 6 secondi invece di 9,6 */
const SPEED = 1.6;
/** Fotogrammi al secondo registrati: tra uno e l'altro il browser interpola */
const FPS = 30;
/** Lato del quadrato inquadrato (unità del disegno, il cerchio è largo 1230): sul telefono il cerchio è largo circa 175 px */
const VIEW = 5930;
/** Onde d'urto e scintille: chiare, sullo sfondo blu notte dell'avvio (nell'originale marrone su beige) */
const FX_COLOR = '#f9f3e5';
/** Larghezza delle immagini incorporate: il cerchio non supera qualche centinaio di pixel */
const PORTRAIT_PX = 520;
const MAP_PX = 320;

// ---- immagini incorporate nell'originale: ritratto (webp) e mappa della deformazione del viso (png)

const html = readFileSync(src, 'utf8');
const embedded = (type) => {
  const m = html.match(new RegExp(`data:image/${type};base64,([A-Za-z0-9+/=]+)`));
  if (!m) throw new Error(`Immagine ${type} non trovata in ${src}`);
  return Buffer.from(m[1], 'base64');
};
const tmp = mkdtempSync(join(tmpdir(), 'avvio-'));
const shrink = (buf, ext, px, format) => {
  const inFile = join(tmp, `in.${ext}`);
  const outFile = join(tmp, `out.${format === 'jpeg' ? 'jpg' : format}`);
  writeFileSync(inFile, buf);
  const args = ['-Z', String(px), '-s', 'format', format];
  if (format === 'jpeg') args.push('-s', 'formatOptions', '82');
  execFileSync('sips', [...args, inFile, '--out', outFile], { stdio: 'ignore' });
  return readFileSync(outFile).toString('base64');
};
// il ritratto è opaco (sfondo chiaro dentro il cerchio): un jpeg pesa poco e lo leggono tutti i browser
const portrait = shrink(embedded('webp'), 'webp', PORTRAIT_PX, 'jpeg');
const map = shrink(embedded('png'), 'png', MAP_PX, 'png');
rmSync(tmp, { recursive: true, force: true });

// ---- calcoli dell'originale (stessi numeri e stesse formule)

const CX = 622.5;
const CY = 620;
const RING_OUT = 595;
const BALL_R = 42;
const BS = 2; // le palline restano della dimensione di prima con il cerchio a metà (SIZE 0,5)
const T = 1.2;
const TIN = 0.95;
const TOUT = 1.1;
const TC = 1.0;
const HITS = [
  { a: 192, b: -12 }, { a: -18, b: 10 }, { a: 160, b: 14 }, { a: 22, b: -12 },
  { a: 218, b: 8 }, { a: -42, b: -8 }, { a: 178, b: 4 }, { a: 6, b: 16 },
];
const N = HITS.length;
const NB = 3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const mod = (a, n) => ((a % n) + n) % n;
const rad = (d) => (d * Math.PI) / 180;
const f = (n) => Math.round(n * 10) / 10;

// le palline partono fuori dal quadrato inquadrato, in qualunque proporzione dello schermo
const half = VIEW / 2;
for (const hit of HITS) {
  const a = rad(hit.a);
  const n = { x: Math.cos(a), y: Math.sin(a) };
  hit.n = n;
  hit.Pc = { x: CX + n.x * (RING_OUT + (BALL_R - 6) * BS), y: CY + n.y * (RING_OUT + (BALL_R - 6) * BS) };
  const bb = rad(hit.a + hit.b);
  const v = { x: Math.cos(bb), y: Math.sin(bb) };
  let L = 1500;
  for (let i = 0; i < 80; i++) {
    if (Math.abs(hit.Pc.x + v.x * L - CX) > half + 120 || Math.abs(hit.Pc.y + v.y * L - CY) > half + 120) break;
    L += 120;
  }
  hit.P0 = { x: hit.Pc.x + v.x * L, y: hit.Pc.y + v.y * L };
  hit.L = L;
  const sp = (L / TIN) * 1.15;
  const vin = { x: -v.x * sp, y: -v.y * sp };
  const dn = vin.x * n.x + vin.y * n.y;
  hit.vout = { x: (vin.x - 2 * dn * n.x) * 0.5, y: (vin.y - 2 * dn * n.y) * 0.5 - 120 };
}

function ballPos(k, t) {
  const hit = HITS[mod(k, N)];
  const tc = k * T + TC;
  const dt = t - tc;
  if (dt <= 0) {
    const u = clamp((t - (tc - TIN)) / TIN, 0, 1);
    const e = 0.65 * u + 0.35 * u * u;
    const arc = Math.sin(Math.PI * u) * 0.07 * hit.L;
    return { x: lerp(hit.P0.x, hit.Pc.x, e), y: lerp(hit.P0.y, hit.Pc.y, e) - arc * (1 - u) };
  }
  const tau = Math.min(dt, TOUT);
  return { x: hit.Pc.x + hit.vout.x * tau, y: hit.Pc.y + hit.vout.y * tau + 0.5 * 2300 * BS * tau * tau };
}

/** Stato di una pallina (slot) all'istante t, o null se nascosta */
function ball(k, t) {
  const tc = k * T + TC;
  const hit = HITS[mod(k, N)];
  if (t < tc - TIN || t > tc + TOUT) return null;
  const e = 0.008;
  const a = ballPos(k, t);
  const a0 = ballPos(k, t - e);
  const a1 = ballPos(k, t + e);
  const vx = (a1.x - a0.x) / (2 * e);
  const vy = (a1.y - a0.y) / (2 * e);
  const sp = Math.hypot(vx, vy) || 1;
  const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
  const dt = t - tc;
  const st = clamp(sp / 5200, 0, 0.45);
  let press = 0;
  if (Math.abs(dt) < 0.05) press = 1 - Math.abs(dt) / 0.05;
  const nang = (Math.atan2(hit.n.y, hit.n.x) * 180) / Math.PI;
  const len = clamp(sp * 0.05, 0, 200) * (press > 0 ? 0 : 1);
  return {
    x: a.x,
    y: a.y,
    opacity: dt > TOUT - 0.3 ? clamp((tc + TOUT - t) / 0.3, 0, 1) : 1,
    // schiacciata contro il cerchio, oppure allungata nella direzione del volo
    squash: press > 0 ? { r: nang, sx: 1 - 0.34 * press, sy: 1 + 0.2 * press } : { r: ang, sx: 1 + st, sy: 1 / (1 + st * 0.6) },
    spin: (t < tc ? t * 420 : t * 900) * (mod(k, 2) ? -1 : 1),
    trail: { r: ang, len: len < 8 ? 0 : len + 2 },
  };
}

/** Vibrazione del cerchio, del ritratto e deformazione del viso dopo ogni colpo */
function shake(t) {
  let ox = 0, oy = 0, rot = 0, m = [1, 0, 0, 1], ix = 0, iy = 0, irot = 0, face = 0, fdir = 1;
  const kc = Math.floor((t - TC) / T);
  for (let k = kc - 1; k <= kc; k++) {
    const hit = HITS[mod(k, N)];
    const dt = t - (k * T + TC);
    if (dt < 0 || dt > 1.4) continue;
    const env = Math.exp(-4.2 * dt);
    const osc = Math.sin(2 * Math.PI * 6.8 * dt);
    const amp = 30 * env * osc;
    ox -= hit.n.x * amp;
    oy -= hit.n.y * amp;
    rot += -hit.n.y * 2.6 * env * Math.sin(2 * Math.PI * 5.4 * dt) + hit.n.x * 0.5 * env * osc;
    const d2 = Math.max(0, dt - 0.045);
    const env2 = Math.exp(-3.4 * d2);
    const osc2 = Math.sin(2 * Math.PI * 6.8 * d2 - 0.4);
    ix += hit.n.x * 16 * env2 * osc2;
    iy += hit.n.y * 16 * env2 * osc2;
    irot += hit.n.x * 2.2 * env2 * Math.sin(2 * Math.PI * 5.2 * d2) - hit.n.y * 0.8 * env2 * osc2;
    const q = Math.exp(-9 * dt) * Math.cos(2 * Math.PI * 9 * dt);
    const mm = -0.075 * q;
    const pp = 0.045 * q;
    const nx = hit.n.x;
    const ny = hit.n.y;
    const a = 1 + mm * nx * nx + pp * ny * ny;
    const b = (mm - pp) * nx * ny;
    const d = 1 + mm * ny * ny + pp * nx * nx;
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * b + m[2] * d, m[1] * b + m[3] * d];
    let ee = dt < 0.05 ? dt / 0.05 : dt < 0.5 ? 1 : dt < 0.95 ? 1 - (dt - 0.5) / 0.45 : 0;
    ee = ee * ee * (3 - 2 * ee);
    if (ee > face) {
      face = ee;
      fdir = hit.n.x >= 0 ? 1 : -1;
    }
  }
  return { ox, oy, rot, m, ix, iy, prot: irot + face * fdir * -1.8, morph: 112 * face };
}

/** Onda d'urto e scintille del colpo j-esimo prima dell'istante t, o null */
function impact(t, j) {
  const kc = Math.floor((t - TC) / T);
  const k = kc - j;
  const hit = HITS[mod(k, N)];
  const dt = t - (k * T + TC);
  if (dt < 0 || dt > 0.5) return { slot: mod(k, 3), state: null };
  const u = dt / 0.5;
  const r0 = 56 + u * 70;
  return {
    slot: mod(k, 3),
    state: {
      x: CX + hit.n.x * (RING_OUT + 4),
      y: CY + hit.n.y * (RING_OUT + 4),
      base: (Math.atan2(hit.n.y, hit.n.x) * 180) / Math.PI,
      opacity: (1 - u) * (1 - u),
      r: 18 + u * 120,
      sw: 10 * (1 - u) + 1,
      r0,
      len: 46 * (1 - u) + 6,
    },
  };
}

// ---- registrazione: un giro completo, a regime (le palline si ripetono ogni N colpi)

const LOOP = (N * T) / SPEED;
const FRAMES = Math.round(LOOP * FPS);
const START = 2 * N * T;
const frames = [];
for (let i = 0; i <= FRAMES; i++) {
  const t = START + (i / FRAMES) * N * T;
  const balls = Array(NB).fill(null);
  const kc = Math.floor((t - TC) / T);
  for (let k = kc - 1; k <= kc + 2; k++) {
    const b = ball(k, t);
    if (b) balls[mod(k, NB)] = b;
  }
  const fx = Array(3).fill(null);
  for (let j = 0; j < 3; j++) {
    const { slot, state } = impact(t, j);
    if (state) fx[slot] = state;
  }
  frames.push({ pct: (i / FRAMES) * 100, shake: shake(t), balls, fx });
}

/** Da nascosta tiene la posizione del fotogramma visibile più vicino: sparisce e ricompare sul posto, senza strisciare */
function hold(states) {
  const out = [...states];
  let last = null;
  for (let i = 0; i < out.length; i++) out[i] ? (last = out[i]) : (out[i] = last && { ...last, hidden: true });
  let next = null;
  for (let i = out.length - 1; i >= 0; i--) out[i] && !out[i].hidden ? (next = out[i]) : !out[i] && (out[i] = next && { ...next, hidden: true });
  return out.map((s) => s ?? { hidden: true });
}

/** @keyframes con un fotogramma per istante registrato, saltando quelli uguali al precedente e al successivo */
function keyframes(name, values) {
  const lines = [];
  values.forEach((v, i) => {
    if (i > 0 && i < values.length - 1 && v === values[i - 1] && v === values[i + 1]) return;
    lines.push(`${f(frames[i].pct * 100) / 100}%{${v}}`);
  });
  return `@keyframes ${name}{${lines.join('')}}`;
}

const r = (n) => Math.round(n * 100) / 100;
const css = [];
const anim = (sel, name) => css.push(`${sel}{animation:${name} ${r(LOOP)}s linear infinite}`);

// cerchio e ritratto
css.push(
  keyframes(
    'body',
    frames.map(({ shake: s }) => `transform:translate(${f(s.ox)}px,${f(s.oy)}px) translate(${CX}px,${CY}px) rotate(${r(s.rot)}deg) matrix(${s.m.map((v) => Math.round(v * 1000) / 1000).join(',')},0,0) translate(${-CX}px,${-CY}px)`),
  ),
);
anim('#body', 'body');
// il ritratto ruota attorno al punto (622, 1050), come nell'originale
css.push(keyframes('person', frames.map(({ shake: s }) => `transform:translate(${f(s.ix)}px,${f(s.iy)}px) translate(622px,1050px) rotate(${r(s.prot)}deg) translate(-622px,-1050px)`)));
anim('#person', 'person');

// palline
for (let b = 0; b < NB; b++) {
  const states = hold(frames.map((fr) => fr.balls[b]));
  css.push(keyframes(`b${b}`, states.map((s) => (s.hidden && !s.x ? 'opacity:0' : `transform:translate(${f(s.x)}px,${f(s.y)}px) scale(${BS});opacity:${s.hidden ? 0 : r(s.opacity)}`))));
  css.push(keyframes(`q${b}`, states.map((s) => (s.squash ? `transform:rotate(${f(s.squash.r)}deg) scale(${r(s.squash.sx)},${r(s.squash.sy)}) rotate(${f(-s.squash.r)}deg)` : 'transform:none'))));
  css.push(keyframes(`s${b}`, states.map((s) => `transform:rotate(${f(s.spin ?? 0)}deg)`)));
  css.push(keyframes(`t${b}`, states.map((s) => (s.trail ? `transform:rotate(${f(s.trail.r)}deg) translate(-8px,0) scale(${f(s.trail.len)},1)` : 'transform:scale(0,1)'))));
  anim(`#b${b}`, `b${b}`);
  anim(`#q${b}`, `q${b}`);
  anim(`#s${b}`, `s${b}`);
  anim(`#t${b}`, `t${b}`);
}

// onde d'urto e scintille
const RAY_LEN = 400;
for (let j = 0; j < 3; j++) {
  const states = hold(frames.map((fr) => fr.fx[j]));
  css.push(keyframes(`f${j}`, states.map((s) => (s.hidden && s.x === undefined ? 'opacity:0' : `transform:translate(${f(s.x)}px,${f(s.y)}px) scale(${BS}) rotate(${f(s.base)}deg);opacity:${s.hidden ? 0 : r(s.opacity)}`))));
  css.push(keyframes(`w${j}`, states.map((s) => (s.r ? `transform:scale(${f(s.r)});stroke-width:${r(s.sw / s.r)}` : 'transform:scale(18)'))));
  // i raggi sono tratti di una riga lunga che parte dal centro: il tratto visibile va da r0 a r0 + len
  css.push(keyframes(`r${j}`, states.map((s) => (s.r0 ? `stroke-dasharray:${f(s.len)} ${RAY_LEN * 2};stroke-dashoffset:${f(-s.r0)}` : `stroke-dasharray:0 ${RAY_LEN * 2}`))));
  anim(`#f${j}`, `f${j}`);
  anim(`#w${j}`, `w${j}`);
  anim(`#r${j}`, `r${j}`);
}

// deformazione del viso: è un attributo del filtro, si anima con SMIL
const morph = frames.map(({ shake: s }) => f(s.morph)).join(';');
// quattro decimali: con due, istanti vicini coinciderebbero e il browser scarterebbe l'animazione
const keyTimes = frames.map((fr) => Math.round(fr.pct * 100) / 10000).join(';');

const rays = Array.from({ length: 7 }, (_, i) => {
  const an = (i - 3) * 0.34;
  return `M0 0L${f(Math.cos(an) * RAY_LEN)} ${f(Math.sin(an) * RAY_LEN)}`;
}).join('');
const ballSvg = (b) => `<g id="b${b}" style="opacity:0"><path id="t${b}" d="M0 ${-BALL_R * 0.85}L-1 0L0 ${BALL_R * 0.85}Z" fill="url(#trailG)"/><g id="q${b}"><g id="s${b}">
<circle r="${BALL_R}" fill="#d9ec3a"/><path d="M-34 -24C-12 -8 -12 12 -34 26M34 -24C12 -8 12 12 34 26" fill="none" stroke="#f9f3e5" stroke-width="5" stroke-linecap="round"/><path d="M-30 26A42 42 0 0 0 30 28A44 44 0 0 1 -30 26Z" fill="#9bae1b" opacity=".55"/><circle r="${BALL_R - 1.5}" fill="none" stroke="#8da01a" stroke-width="3" opacity=".7"/></g></g></g>`;
const fxSvg = (j) => `<g id="f${j}" style="opacity:0" fill="none" stroke="${FX_COLOR}" stroke-linecap="round"><circle id="w${j}" r="1" stroke-width=".5"/><path id="r${j}" d="${rays}" stroke-width="7"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(CX - half)} ${f(CY - half)} ${VIEW} ${VIEW}" preserveAspectRatio="xMidYMid slice">
<!-- Generato da scripts/avvio/genera.mjs dal loader brain/sources/loader-palline.html: non modificare a mano -->
<style>
${css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<filter id="morph" filterUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254" color-interpolation-filters="sRGB">
<feImage href="data:image/png;base64,${map}" x="0" y="0" width="1254" height="1254" preserveAspectRatio="none" result="m"/>
<feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" dur="${r(LOOP)}s" repeatCount="indefinite" values="${morph}" keyTimes="${keyTimes}"/></feDisplacementMap>
</filter>
<clipPath id="inner"><circle cx="622.5" cy="620" r="576"/></clipPath>
<linearGradient id="trailG" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#d9ec3a" stop-opacity=".55"/><stop offset="1" stop-color="#d9ec3a" stop-opacity="0"/></linearGradient>
</defs>
<g id="body"><g clip-path="url(#inner)"><rect width="1254" height="1254" fill="#f9f3e5"/><g id="person"><image href="data:image/jpeg;base64,${portrait}" width="1254" height="1254" filter="url(#morph)"/></g></g>
<circle cx="622.5" cy="620" r="590" fill="none" stroke="#000" stroke-opacity=".10" stroke-width="22" transform="translate(7 12)"/>
<circle cx="622.5" cy="620" r="584" fill="none" stroke="#fff" stroke-width="24"/></g>
${[0, 1, 2].map(fxSvg).join('\n')}
${[0, 1, 2].map(ballSvg).join('\n')}
</svg>
`;
writeFileSync(out, svg);
console.log(`${out}: ${Math.round(svg.length / 1024)} KB, giro di ${r(LOOP)} s, ${FRAMES} fotogrammi`);
