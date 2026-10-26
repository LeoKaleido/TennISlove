// Dati iniziali del torneo 2026/27. Fonte: brain/reference/torneo-2026-27.md

import type { MatchScoreInput } from '@tentennis/shared';

export const SEASON = {
  name: 'ATP Umbria Tournament',
  label: '2026/27',
  subtitle: 'Amici Tennis, Pre-cena',
  // fase finale rimandata: per ora solo girone (risposte di Giuseppe del 26/10, D-041)
  qualifiers: 0,
};

/** Nell'ordine dell'elenco iniziale dell'Excel (foglio Calcoli) */
export const PLAYERS = [
  { key: 'Giuseppe', firstName: 'Giuseppe', lastName: 'De Francesca', email: 'giuseppe.defrancesca@gmail.com' },
  { key: 'Marco', firstName: 'Marco', lastName: 'Rondoni', email: 'm.rondoni@libero.it' },
  { key: 'Alessandro C', firstName: 'Alessandro', lastName: 'Cofanelli', email: 'alessandro@kalei.do', isAdmin: true },
  { key: 'Alessandro P', firstName: 'Alessandro', lastName: 'Piccioni', email: 'piccionister@gmail.com' },
  { key: 'Francesco', firstName: 'Francesco', lastName: 'Artegiani', email: 'francescoartegiani@gmail.com' },
  { key: 'Fabrizio', firstName: 'Fabrizio', lastName: 'Ricci', email: 'fabrizio.ricci.pg@gmail.com' },
  { key: 'Alessio', firstName: 'Alessio', lastName: 'Panfili', email: 'alessio.panfili.77@gmail.com' },
  { key: 'Leonardo', firstName: 'Leonardo', lastName: 'Panfili', email: 'leopanfili@gmail.com' },
  { key: 'Gennaro', firstName: 'Gennaro', lastName: 'Carucci', email: 'gennaro_carucci@libero.it' },
  { key: 'Federico', firstName: 'Federico', lastName: 'Piccioni', email: 'federicopiccioni@gmail.com' },
  { key: 'Michele', firstName: 'Michele', lastName: 'Giancarlo', email: 'm_giancarlo@yahoo.it' },
  { key: 'Luca', firstName: 'Luca', lastName: 'Ceccarelli', email: 'avvocatoceccarelli@gmail.com' },
] as const;

/** Account solo admin, senza giocatore (D-025) */
export const ADMIN_ONLY_EMAILS = ['giuseppe@kalei.do'];

type Key = (typeof PLAYERS)[number]['key'];

export const ROUNDS: { startsOn: string; endsOn: string; pauseAfter?: string; matches: [Key, Key][] }[] = [
  { startsOn: '2026-10-12', endsOn: '2026-10-18', matches: [['Giuseppe', 'Luca'], ['Marco', 'Michele'], ['Alessandro C', 'Federico'], ['Alessandro P', 'Gennaro'], ['Francesco', 'Leonardo'], ['Fabrizio', 'Alessio']] },
  { startsOn: '2026-10-19', endsOn: '2026-10-25', matches: [['Giuseppe', 'Michele'], ['Luca', 'Federico'], ['Marco', 'Gennaro'], ['Alessandro C', 'Leonardo'], ['Alessandro P', 'Alessio'], ['Francesco', 'Fabrizio']] },
  { startsOn: '2026-10-26', endsOn: '2026-11-01', matches: [['Giuseppe', 'Federico'], ['Michele', 'Gennaro'], ['Luca', 'Leonardo'], ['Marco', 'Alessio'], ['Alessandro C', 'Fabrizio'], ['Alessandro P', 'Francesco']] },
  { startsOn: '2026-11-02', endsOn: '2026-11-08', matches: [['Giuseppe', 'Gennaro'], ['Federico', 'Leonardo'], ['Michele', 'Alessio'], ['Luca', 'Fabrizio'], ['Marco', 'Francesco'], ['Alessandro C', 'Alessandro P']] },
  { startsOn: '2026-11-09', endsOn: '2026-11-15', matches: [['Giuseppe', 'Leonardo'], ['Gennaro', 'Alessio'], ['Federico', 'Fabrizio'], ['Michele', 'Francesco'], ['Luca', 'Alessandro P'], ['Marco', 'Alessandro C']] },
  { startsOn: '2026-11-16', endsOn: '2026-11-22', matches: [['Giuseppe', 'Alessio'], ['Leonardo', 'Fabrizio'], ['Gennaro', 'Francesco'], ['Federico', 'Alessandro P'], ['Michele', 'Alessandro C'], ['Luca', 'Marco']] },
  { startsOn: '2026-11-23', endsOn: '2026-11-29', matches: [['Giuseppe', 'Fabrizio'], ['Alessio', 'Francesco'], ['Leonardo', 'Alessandro P'], ['Gennaro', 'Alessandro C'], ['Federico', 'Marco'], ['Michele', 'Luca']] },
  { startsOn: '2026-11-30', endsOn: '2026-12-06', matches: [['Giuseppe', 'Francesco'], ['Fabrizio', 'Alessandro P'], ['Alessio', 'Alessandro C'], ['Leonardo', 'Marco'], ['Gennaro', 'Luca'], ['Federico', 'Michele']] },
  { startsOn: '2026-12-07', endsOn: '2026-12-13', matches: [['Giuseppe', 'Alessandro P'], ['Francesco', 'Alessandro C'], ['Fabrizio', 'Marco'], ['Alessio', 'Luca'], ['Leonardo', 'Michele'], ['Gennaro', 'Federico']] },
  { startsOn: '2026-12-14', endsOn: '2026-12-18', pauseAfter: 'Pausa natalizia, 19 dic - 10 gen', matches: [['Giuseppe', 'Alessandro C'], ['Alessandro P', 'Marco'], ['Francesco', 'Luca'], ['Fabrizio', 'Michele'], ['Alessio', 'Federico'], ['Leonardo', 'Gennaro']] },
  { startsOn: '2027-01-11', endsOn: '2027-01-17', matches: [['Giuseppe', 'Marco'], ['Alessandro C', 'Luca'], ['Alessandro P', 'Michele'], ['Francesco', 'Federico'], ['Fabrizio', 'Gennaro'], ['Alessio', 'Leonardo']] },
];

/** Risultati iniziali, confermati: stanno in seed-results.json, rigenerabile dall'Excel con `pnpm seed:excel` */
export type SeedResult = MatchScoreInput;

/** Circoli indicati da Giuseppe il 26/10/2026 (brain/comunicazioni/2026-10-26_risposte-di-Giuseppe.docx) */
export const CLUBS = [
  { name: 'Tennis Country (ex 3T)', city: 'Santa Maria degli Angeli, Assisi', mapsUrl: 'https://share.google/oCkPEujfmgAmhS7Sv' },
  { name: 'Tennis Training School', city: 'Foligno', mapsUrl: 'https://maps.app.goo.gl/RMHWePdLaFYhDcUW6' },
  { name: 'Sporting Club Torgiano', city: 'Torgiano', mapsUrl: 'https://maps.app.goo.gl/aU9jKxvirF2x3jUT9' },
  { name: 'ASD Mariquita Sporting Club', city: 'Deruta', mapsUrl: 'https://maps.app.goo.gl/NY72YFY5E5KYCaWM7' },
  { name: 'Gryphus Sporting Club', city: 'Perugia', mapsUrl: 'https://maps.app.goo.gl/StMdoJAfoJpJb8z16' },
  { name: 'Pattol Club', city: 'Ponte Pattoli, Perugia', mapsUrl: 'https://maps.app.goo.gl/Uq34Q3u329k7QYkb6' },
  { name: 'Centro Sportivo Tennis Chiugiana', city: 'Corciano', mapsUrl: 'https://maps.app.goo.gl/WTZMSbvdckp7fhwK8' },
  { name: 'Circolo Tennis Foligno', city: 'Foligno', mapsUrl: 'https://maps.app.goo.gl/tfEzTxz2AxKhLo4u7' },
  { name: 'CUS Perugia', city: 'Perugia', mapsUrl: 'https://maps.app.goo.gl/2srkWabAtKpeqpzk9' },
];

export const matchCode = (round: number, index: number) =>
  `G${String(round).padStart(2, '0')}-${String(index).padStart(2, '0')}`;
