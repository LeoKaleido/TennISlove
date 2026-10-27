// Badge (D-062): loghi e calcolo a partire dai dati di una stagione.

import { BADGES, computeBadges, COUNTS_IN_STANDINGS, type BadgeId, type BadgeState } from '@tentennis/shared';
import type { SeasonOverview } from './api';
import { playedOn } from './data';

/** Colori della medaglia per gruppo: risultati, costanza, partecipazione, stagione */
const GROUP = {
  results: { from: '#E37A45', to: '#A9461F', ink: '#FFFFFF' },
  form: { from: '#33AE80', to: '#166146', ink: '#FFFFFF' },
  social: { from: '#4796D8', to: '#22598E', ink: '#FFFFFF' },
  season: { from: '#F0D25E', to: '#B98F1A', ink: '#0B1A24' },
};

/** Bordo metallico dei badge più prestigiosi */
export type BadgeTier = 'gold' | 'silver' | 'bronze';

export const BADGE_TIER: Partial<Record<BadgeId, BadgeTier>> = {
  CHAMPION: 'gold',
  ORACLE: 'gold',
  PODIUM: 'silver',
  GIANT_KILLER: 'silver',
  STREAK: 'silver',
  TIEBREAK_KING: 'silver',
  BAGEL: 'bronze',
  COMEBACK: 'bronze',
  WALL: 'bronze',
  SEER: 'bronze',
  UPSET: 'bronze',
};

/** Riflesso del metallo: chiaro in alto a sinistra, scuro in basso a destra */
const METAL: Record<BadgeTier, [string, string, string]> = {
  gold: ['#FFF1B0', '#E2B93B', '#9C7413'],
  silver: ['#FFFFFF', '#C3CBD2', '#7D8790'],
  bronze: ['#F6C9A0', '#C9814A', '#7E4720'],
};

/** Tratto del simbolo. Ogni attributo una volta sola: la card carica l'SVG come immagine, che vuole XML valido */
const stroke = (width = 3.2) => `fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
const STROKE = stroke();

/** Simbolo di ogni badge, disegnato in un riquadro 64×64 */
const GLYPHS: Record<BadgeId, { group: keyof typeof GROUP; svg: string }> = {
  FIRST_WIN: { group: 'results', svg: `<path d="M24 47V17" ${STROKE}/><path d="M24 18h18l-5 6.5 5 6.5H24z" fill="currentColor"/>` },
  BAGEL: {
    group: 'results',
    svg: `<circle cx="32" cy="32" r="11" fill="none" stroke="currentColor" stroke-width="7"/><path d="M27 22.5l1.5 1M36 22l-1 1.6M41.5 30l-1.8.4M23 36.5l1.6-.7M37 41.5l-.8-1.6" ${stroke(1.6)} stroke-opacity=".55"/>`,
  },
  COMEBACK: { group: 'results', svg: `<path d="M17 24l10 13 8-7 11-11" ${STROKE}/><path d="M38 19h8v8" ${STROKE}/>` },
  WALL: {
    group: 'results',
    svg: `<rect x="17" y="20" width="30" height="24" rx="2" ${STROKE}/><path d="M17 28h30M17 36h30M32 20v8M24.5 28v8M39.5 28v8M32 36v8" ${stroke(2.6)}/>`,
  },
  STREAK: {
    group: 'form',
    svg: `<path d="M32 47c-7 0-11-5-10-11 1-5 5-7 5-14 4 3 6 6 6 9 2-2 3-4 3-7 5 4 7 9 6 14-1 6-5 9-10 9z" fill="currentColor"/><path d="M32 47c-3 0-5-2-4.5-5 .5-3 2.5-4 2.5-7 3 2 6 5 5.5 8-.5 2.5-1.5 4-3.5 4z" fill="var(--badge-to)"/>`,
  },
  TIEBREAK_KING: { group: 'form', svg: `<path d="M18 41l2-17 7 7 5-11 5 11 7-7 2 17z" fill="currentColor"/><path d="M19 46h26" ${STROKE}/>` },
  GIANT_KILLER: { group: 'form', svg: `<path d="M36 15L21 35h10l-3 14 15-21H33z" fill="currentColor"/>` },
  PHOTOGRAPHER: {
    group: 'social',
    svg: `<path d="M17 27a3 3 0 013-3h5l3-5h8l3 5h5a3 3 0 013 3v15a3 3 0 01-3 3H20a3 3 0 01-3-3z" ${STROKE}/><circle cx="32" cy="34" r="6" ${STROKE}/>`,
  },
  SEER: {
    group: 'social',
    svg: `<circle cx="32" cy="29" r="11" ${STROKE}/><path d="M26.5 27a6 6 0 015-5" ${stroke(2.4)}/><path d="M23 46h18l-3-6H26z" fill="currentColor"/>`,
  },
  UPSET: {
    group: 'social',
    svg: `<path d="M21 26l6-7h10l6 7-11 20z" ${STROKE}/><path d="M21 26h22M27 19l5 7 5-7M27.5 26L32 46l4.5-20" ${stroke(2.4)}/>`,
  },
  CHAMPION: {
    group: 'season',
    svg: `<path d="M24 17h16v9c0 5-3.5 9-8 9s-8-4-8-9z" fill="currentColor"/><path d="M24 20h-5c0 5 2 8 5 8M40 20h5c0 5-2 8-5 8M32 35v7M26 46h12M28 42h8" ${STROKE}/>`,
  },
  ORACLE: {
    group: 'season',
    svg: `<path d="M15 32c4-7 10-11 17-11s13 4 17 11c-4 7-10 11-17 11s-13-4-17-11z" ${STROKE}/><circle cx="32" cy="32" r="5.5" fill="currentColor"/>`,
  },
  PODIUM: {
    group: 'season',
    svg: `<path d="M26 46V25h12v21M18 46V33h8M38 46V37h8v9M15 46h34" ${STROKE}/><path d="M31 30.5l2-1.5v8" ${stroke(2.4)}/>`,
  },
};

/** SVG completo della medaglia: serve uguale nella pagina e nell'immagine della card */
export function badgeSvg(id: BadgeId, size = 64): string {
  const g = GLYPHS[id];
  const c = GROUP[g.group];
  const grad = `badge-${id}`;
  const tier = BADGE_TIER[id];
  const metal = tier && METAL[tier];
  // con il bordo la medaglia si restringe, così il simbolo resta della stessa misura
  const rim = metal
    ? `<linearGradient id="${grad}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metal[0]}"/><stop offset=".45" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></linearGradient>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" style="color:${c.ink}">
<defs><linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.from}"/><stop offset="1" stop-color="${c.to}"/></linearGradient>${rim}</defs>
${metal ? `<circle cx="32" cy="32" r="31.5" fill="url(#${grad}-rim)"/><circle cx="32" cy="32" r="27.5" fill="url(#${grad})"/><circle cx="32" cy="32" r="27.5" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1"/>` : `<circle cx="32" cy="32" r="31" fill="url(#${grad})"/>`}
<circle cx="32" cy="32" r="${metal ? 24 : 26.5}" fill="none" stroke="${c.ink}" stroke-opacity=".28" stroke-width="1.5"/>
${g.svg.replaceAll('var(--badge-to)', c.to)}
</svg>`;
}

export const badgeName = (id: BadgeId) => BADGES[id].name;

/** Badge di un giocatore in una stagione */
export function badgesFor(data: SeasonOverview, playerId: string): BadgeState[] {
  const archived = data.season.status === 'ARCHIVED';
  const prediction = data.predictionStandings.find((r) => r.playerId === playerId);
  return computeBadges({
    playerId,
    playerIds: data.players.map((p) => p.id),
    matches: data.matches.map((m) => {
      const r = m.result;
      return {
        id: m.id,
        playerAId: m.playerAId,
        playerBId: m.playerBId,
        score: r && COUNTS_IN_STANDINGS.includes(r.status) ? r : null,
        playedOn: playedOn(m, data.rounds),
        submittedAt: r?.submittedAt ?? null,
        photoCount: m.photoCount,
      };
    }),
    predictions: prediction ? { correct: prediction.correct, upsets: prediction.upsets } : null,
    final: archived
      ? {
          championId: data.season.championPlayerId,
          position: data.standings.find((r) => r.playerId === playerId)?.position ?? null,
          predictionPosition: prediction?.position ?? null,
          predictionPoints: prediction?.points ?? 0,
        }
      : null,
  });
}
