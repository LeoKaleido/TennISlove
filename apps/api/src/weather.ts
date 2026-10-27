// Meteo della partita (D-065): previsioni Open-Meteo per il circolo all'ora della partita.
// Le chiede il server (l'indirizzo dei giocatori non esce verso terzi) e le tiene 30 minuti.

import type { Club } from '@prisma/client';
import { romeDay, romeTime } from '@tentennis/shared';
import { db } from './db';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
/** Le previsioni orarie arrivano fino a 16 giorni */
const HORIZON_DAYS = 16;
const CACHE_MS = 30 * 60_000;
const MATCH_HOURS = 2;

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

/** Dal codice WMO al tipo di tempo, dal più al meno grave: nelle 2 ore conta il peggiore */
const KINDS: [WeatherKind, (code: number) => boolean][] = [
  ['storm', (c) => c >= 95],
  ['snow', (c) => (c >= 71 && c <= 77) || c === 85 || c === 86],
  ['rain', (c) => (c >= 61 && c <= 67) || (c >= 80 && c <= 82)],
  ['drizzle', (c) => c >= 51 && c <= 57],
  ['fog', (c) => c === 45 || c === 48],
  ['cloudy', (c) => c === 3],
  ['partly', (c) => c === 1 || c === 2],
  ['clear', () => true],
];
const kindOf = (code: number) => KINDS.findIndex(([, test]) => test(code));

export interface MatchWeather {
  kind: WeatherKind;
  /** gradi all'inizio della partita */
  temperature: number;
  /** probabilità di pioggia massima nelle 2 ore, in % */
  rainChance: number;
  /** vento massimo, km/h */
  wind: number;
}

const fetchJson = async <T>(url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} da ${new URL(url).host}`);
  return (await res.json()) as T;
};

// ---- posizione dei circoli

/** Coordinate da un link di Google Maps: quelle del posto (!3d…!4d…), altrimenti il centro della mappa (@lat,lng) */
export function coordinatesFromMapsUrl(url: string): { latitude: number; longitude: number } | null {
  const place = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const center = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = place ?? center;
  return m ? { latitude: Number(m[1]), longitude: Number(m[2]) } : null;
}

/** I link brevi (maps.app.goo.gl) portano alla pagina completa: si seguono i rimandi fino a trovare le coordinate */
async function resolveMapsUrl(url: string) {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const found = coordinatesFromMapsUrl(current);
    if (found) return found;
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const next = res.headers.get('location');
    if (!next) return null;
    current = new URL(next, current).toString();
  }
  return coordinatesFromMapsUrl(current);
}

/** Dalla città del circolo ("Santa Maria degli Angeli, Assisi"): tra gli omonimi, quello che contiene la seconda parte */
async function geocodeCity(city: string) {
  const [place, ...rest] = city.split(',').map((s) => s.trim());
  if (!place) return null;
  const hint = rest.join(' ').toLowerCase();
  const data = await fetchJson<{ results?: { latitude: number; longitude: number; admin1?: string; admin2?: string; admin3?: string }[] }>(
    `${GEOCODING_URL}?name=${encodeURIComponent(place)}&count=10&language=it&countryCode=IT`,
  );
  const results = data.results ?? [];
  const best = (hint && results.find((r) => [r.admin1, r.admin2, r.admin3].some((a) => a?.toLowerCase().includes(hint)))) || results[0];
  return best ? { latitude: best.latitude, longitude: best.longitude } : null;
}

export async function locateClub(club: Pick<Club, 'mapsUrl' | 'city'>) {
  const fromMaps = club.mapsUrl ? await resolveMapsUrl(club.mapsUrl).catch(() => null) : null;
  return fromMaps ?? (club.city ? await geocodeCity(club.city).catch(() => null) : null);
}

/** Posizione dei circoli che non ce l'hanno: all'avvio e dopo ogni modifica dal gestionale */
export async function locateMissingClubs(log: (msg: string) => void = console.log) {
  const clubs = await db.club.findMany({ where: { OR: [{ latitude: null }, { longitude: null }] } });
  for (const club of clubs) {
    const pos = await locateClub(club);
    if (pos) await db.club.update({ where: { id: club.id }, data: pos });
    log(pos ? `Meteo: posizione trovata per ${club.name}` : `Meteo: posizione non trovata per ${club.name}`);
  }
}

// ---- previsioni

const cache = new Map<string, { at: number; hourly: Record<string, number[]> & { time: string[] } }>();

async function dayForecast(lat: number, lng: number, day: string) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${day}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.hourly;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
    timezone: 'Europe/Rome',
    start_date: day,
    end_date: day,
  });
  const data = await fetchJson<{ hourly: Record<string, number[]> & { time: string[] } }>(`${FORECAST_URL}?${params}`);
  cache.set(key, { at: Date.now(), hourly: data.hourly });
  return data.hourly;
}

/** Meteo nelle 2 ore della partita; null se è passata, troppo lontana o il circolo non ha posizione */
export async function matchWeather(club: Pick<Club, 'latitude' | 'longitude'>, start: Date, now = new Date()): Promise<MatchWeather | null> {
  if (club.latitude === null || club.longitude === null) return null;
  const end = start.getTime() + MATCH_HOURS * 3_600_000;
  if (end < now.getTime() || start.getTime() - now.getTime() > HORIZON_DAYS * 86_400_000) return null;

  const day = romeDay(start);
  const hourly = await dayForecast(club.latitude, club.longitude, day);
  const first = Number(romeTime(start).slice(0, 2));
  const hours = hourly.time.map((t, i) => ({ h: Number(t.slice(11, 13)), i })).filter(({ h }) => h >= first && h < first + MATCH_HOURS);
  if (hours.length === 0) return null;
  const pick = (k: string) => hours.map(({ i }) => hourly[k]![i]!).filter((v) => v !== null && v !== undefined);
  const codes = pick('weather_code');
  const worst = Math.min(...codes.map(kindOf));
  return {
    kind: KINDS[worst]![0],
    temperature: Math.round(pick('temperature_2m')[0] ?? 0),
    rainChance: Math.max(0, ...pick('precipitation_probability')),
    wind: Math.round(Math.max(0, ...pick('wind_speed_10m'))),
  };
}
