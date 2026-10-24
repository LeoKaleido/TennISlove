// Date del torneo: le giornate sono intervalli di giorni (YYYY-MM-DD) nel fuso di Roma.

export const TIME_ZONE = 'Europe/Rome';

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** Giorno di calendario (YYYY-MM-DD) di un istante, nel fuso di Roma */
export function romeDay(instant: Date | string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
}

/** Ora (HH:MM) di un istante, nel fuso di Roma */
export function romeTime(instant: Date | string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('it-IT', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(d);
}

const parts = (day: string) => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

/** "26 ott" */
export function formatDay(day: string): string {
  const { m, d } = parts(day);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "mer 28 ott" */
export function formatDayWithWeekday(day: string): string {
  const { m, d, weekday } = parts(day);
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS[m - 1]}`;
}

/** "12 - 18 ott" oppure "26 ott - 1 nov" */
export function formatRange(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  if (a.m === b.m && a.y === b.y) return `${a.d} - ${b.d} ${MONTHS[b.m - 1]}`;
  return `${formatDay(start)} - ${formatDay(end)}`;
}

/** Istante corrispondente a giorno + ora locali di Roma (gestisce l'ora legale) */
export function fromRomeLocal(day: string, time: string): Date {
  const { y, m, d } = parts(day);
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  // differenza tra l'ora di Roma e UTC in quel momento
  const romeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(asUtc));
  const get = (t: string) => Number(romeParts.find((p) => p.type === t)!.value);
  const romeAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(asUtc - (romeAsUtc - asUtc));
}

export function addDays(day: string, n: number): string {
  const { y, m, d } = parts(day);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}
