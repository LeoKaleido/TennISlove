// Card del giocatore (D-062): immagine 1080×1350 da condividere, disegnata su canvas.

import type { BadgeId } from '@tentennis/shared';
import type { Player, SeasonOverview } from './api';
import { badgeSvg } from './badges';
import { avatarColors, initials } from './data';

const W = 1080;
const H = 1350;
const INK = '#0B1A24';
const MINT = '#C6EEDB';

/** Logo dell'app (lo stesso di components/ui.tsx), come SVG da disegnare */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 40 40"><defs><clipPath id="c"><path d="M20 33.2S7.4 25.4 4.3 17.8C1.9 11.2 6.1 4.4 12.6 4.4c3.3 0 5.8 1.6 7.4 4 1.6-2.4 4.1-4 7.4-4 6.5 0 10.7 6.8 8.3 13.4C32.6 25.4 20 33.2 20 33.2z"/></clipPath></defs><rect width="40" height="40" rx="11" fill="#16303D"/><g clip-path="url(#c)"><rect width="40" height="40" fill="#E2CB58"/><circle cx="14" cy="13" r="21" fill="none" stroke="#135E52" stroke-opacity=".18" stroke-width="9"/><path d="M5.5 6.5C10 12.5 30 12.5 34.5 6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M9 31C12.5 22.5 27.5 22.5 31 31" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g></svg>`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Immagine non caricata'));
    img.src = src;
  });
}

const svgImage = (svg: string) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

/** Testo con la larghezza ridotta dell'Archivo condensato, dove il browser lo supporta */
function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, stretch: CanvasFontStretch = 'normal') {
  ctx.font = `${weight} ${size}px Archivo, system-ui, sans-serif`;
  if ('fontStretch' in ctx) ctx.fontStretch = stretch;
}

/** Riduce il corpo finché il testo non sta nella larghezza */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, stretch: CanvasFontStretch) {
  let s = size;
  setFont(ctx, weight, s, stretch);
  while (s > 40 && ctx.measureText(text).width > maxWidth) setFont(ctx, weight, (s -= 4), stretch);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** `badges`: quelli ottenuti, nell'ordine in cui mostrarli, con il livello */
export async function drawPlayerCard(data: SeasonOverview, player: Player, badges: { id: BadgeId; level: number }[]): Promise<Blob> {
  await Promise.all([document.fonts.load('900 100px Archivo'), document.fonts.load('700 40px Archivo')]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // sfondo: blu notte con le righe del campo, come la Home
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#102C33');
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, 470);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(198,238,219,.10)';
  ctx.lineWidth = 4;
  ctx.strokeRect(-330, -620, 660, 1240);
  ctx.beginPath();
  ctx.moveTo(-330, 0);
  ctx.lineTo(330, 0);
  ctx.moveTo(0, -330);
  ctx.lineTo(0, 330);
  ctx.moveTo(-250, -330);
  ctx.lineTo(250, -330);
  ctx.moveTo(-250, 330);
  ctx.lineTo(250, 330);
  ctx.stroke();
  ctx.restore();

  // intestazione: logo, nome dell'app, torneo
  ctx.drawImage(await svgImage(LOGO_SVG), 64, 60, 84, 84);
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  setFont(ctx, 800, 46, 'condensed');
  ctx.fillText('TennIsLove', 166, 104);
  ctx.textAlign = 'right';
  ctx.fillStyle = MINT;
  setFont(ctx, 700, 28);
  ctx.fillText(`TORNEO ${data.season.label}`, W - 64, 104);
  ctx.textAlign = 'center';

  // foto, o le iniziali sul colore dell'avatar
  const cx = W / 2;
  const cy = 400;
  const r = 180;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const colors = avatarColors(player.id);
  const photo = player.photoUrl ? await loadImage(player.photoUrl).catch(() => null) : null;
  if (photo) {
    const scale = Math.max((2 * r) / photo.width, (2 * r) / photo.height);
    ctx.drawImage(photo, cx - (photo.width * scale) / 2, cy - (photo.height * scale) / 2, photo.width * scale, photo.height * scale);
  } else {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = colors.fg;
    setFont(ctx, 800, 130);
    ctx.fillText(initials(player), cx, cy + 6);
  }
  ctx.restore();
  ctx.strokeStyle = MINT;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.stroke();

  // nome
  ctx.fillStyle = '#FFFFFF';
  fitText(ctx, player.firstName.toUpperCase(), 900, 128, W - 120, 'extra-condensed');
  ctx.fillText(player.firstName.toUpperCase(), cx, 680);
  fitText(ctx, player.lastName.toUpperCase(), 900, 128, W - 120, 'extra-condensed');
  ctx.fillText(player.lastName.toUpperCase(), cx, 790);

  const row = data.standings.find((s) => s.playerId === player.id);
  if (row) {
    ctx.fillStyle = MINT;
    setFont(ctx, 700, 38);
    ctx.fillText(`${row.position}° in classifica`, cx, 880);

    // statistiche
    const stats = [
      { v: String(row.points), l: 'Punti' },
      { v: String(row.played), l: 'Giocate' },
      { v: String(row.won), l: 'Vinte' },
      { v: row.gamesDiff > 0 ? `+${row.gamesDiff}` : String(row.gamesDiff), l: 'Diff. game' },
    ];
    const gap = 16;
    const bw = (W - 128 - gap * 3) / 4;
    stats.forEach((s, i) => {
      const x = 64 + i * (bw + gap);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      roundRect(ctx, x, 940, bw, 150, 28);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 900, 64, 'condensed');
      ctx.fillText(s.v, x + bw / 2, 1000);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      setFont(ctx, 600, 26);
      ctx.fillText(s.l, x + bw / 2, 1056);
    });
  }

  // badge ottenuti: al massimo 7, poi "+N"
  const shown = badges.slice(0, 7);
  const size = 112;
  const step = 124;
  if (shown.length > 0) {
    const icons = await Promise.all(shown.map((b) => svgImage(badgeSvg(b.id, size))));
    const extra = badges.length - shown.length;
    const count = shown.length + (extra > 0 ? 1 : 0);
    let x = cx - (count * step - (step - size)) / 2;
    icons.forEach((icon, i) => {
      ctx.drawImage(icon, x, 1132, size, size);
      const level = shown[i]!.level;
      if (level > 1) {
        // livello in un tondino in basso a destra, come nel profilo
        const bx = x + size - 14;
        const by = 1132 + size - 12;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(bx - 26, by - 19, 52, 38, 19);
        ctx.fill();
        ctx.fillStyle = INK;
        setFont(ctx, 800, 26);
        ctx.fillText(`×${level}`, bx, by + 1);
      }
      x += step;
    });
    if (extra > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.arc(x + size / 2, 1132 + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 800, 40);
      ctx.fillText(`+${extra}`, x + size / 2, 1132 + size / 2 + 2);
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    setFont(ctx, 600, 32);
    ctx.fillText('I primi badge stanno per arrivare', cx, 1188);
  }

  ctx.fillStyle = 'rgba(255,255,255,.45)';
  setFont(ctx, 600, 26);
  ctx.fillText(data.season.name, cx, 1300);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Immagine non creata'))), 'image/png'));
}
