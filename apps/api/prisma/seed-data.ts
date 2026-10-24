// Dati iniziali del torneo 2026/27. Fonte: brain/reference/torneo-2026-27.md

export const SEASON = {
  name: 'ATP Umbria Tournament',
  label: '2026/27',
  subtitle: 'Amici Tennis, Pre-cena',
  qualifiers: 8,
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

type Pair = [number, number];

/** Risultati dell'Excel al 22/10/2026, per codice partita. Entrano come confermati. */
export const RESULTS: Record<string, { set1: Pair; set2: Pair; stb?: Pair }> = {
  'G01-01': { set1: [6, 2], set2: [6, 2] },
  'G01-02': { set1: [6, 1], set2: [6, 3] },
  'G01-03': { set1: [1, 6], set2: [2, 6] },
  'G01-04': { set1: [6, 3], set2: [6, 2] },
  'G01-05': { set1: [2, 6], set2: [6, 4], stb: [10, 5] },
  'G01-06': { set1: [3, 6], set2: [3, 6] },
  'G02-02': { set1: [0, 6], set2: [2, 6] },
  'G02-05': { set1: [4, 6], set2: [6, 3], stb: [9, 11] },
};

/** Segnaposto finché Giuseppe non manda la lista dei circoli (Q-007) */
export const PLACEHOLDER_CLUBS = [
  { name: 'Circolo Tennis Perugia', city: 'Perugia' },
  { name: 'TC Ponte San Giovanni', city: 'Ponte San Giovanni' },
  { name: 'Tennis Club Assisi', city: 'Santa Maria degli Angeli' },
  { name: 'CT Bastia Umbra', city: 'Bastia Umbra' },
  { name: 'Polisportiva Corciano', city: 'Corciano' },
];

export const matchCode = (round: number, index: number) =>
  `G${String(round).padStart(2, '0')}-${String(index).padStart(2, '0')}`;
