// Meteo della partita (D-065): previsioni Open-Meteo per il circolo all'ora della partita, chieste dal server.

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '../api';
import { HelpLink } from './ui';

type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

interface MatchWeather {
  kind: Kind;
  temperature: number;
  rainChance: number;
  wind: number;
}

const LABEL: Record<Kind, string> = {
  clear: 'Sereno',
  partly: 'Poco nuvoloso',
  cloudy: 'Nuvoloso',
  fog: 'Nebbia',
  drizzle: 'Pioggerella',
  rain: 'Pioggia',
  snow: 'Neve',
  storm: 'Temporale',
};

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const CLOUD = 'M7.5 17.5h9a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.3A4.2 4.2 0 007.5 17.5z';

const ICON: Record<Kind, ReactNode> = {
  clear: (
    <>
      <circle cx="12" cy="12" r="4" {...S} />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" {...S} />
    </>
  ),
  partly: (
    <>
      <path d="M8.5 4.5v1.3M3.8 9.2h1.3M5.2 5.9l.9.9M11.8 5.9l-.9.9M5.5 11.8a3.4 3.4 0 015.6-4" {...S} />
      <path d="M9.5 19h8a3 3 0 00.3-6 4.3 4.3 0 00-8.3-1A3.5 3.5 0 009.5 19z" {...S} />
    </>
  ),
  cloudy: <path d={CLOUD} {...S} />,
  fog: <path d="M4 9h16M6 13h12M4 17h16" {...S} />,
  drizzle: (
    <>
      <path d="M7.5 14.5h9a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.3A4.2 4.2 0 007.5 14.5z" {...S} />
      <path d="M9 18v1M13 18v1M17 18v1" {...S} />
    </>
  ),
  rain: (
    <>
      <path d="M7.5 14h9a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.3A4.2 4.2 0 007.5 14z" {...S} />
      <path d="M8.5 17l-1 3M12.5 17l-1 3M16.5 17l-1 3" {...S} />
    </>
  ),
  snow: (
    <>
      <path d="M7.5 14h9a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.3A4.2 4.2 0 007.5 14z" {...S} />
      <path d="M9 18.5h.01M12.5 19.5h.01M16 18.5h.01" {...S} strokeWidth={3} />
    </>
  ),
  storm: (
    <>
      <path d="M7.5 14h9a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.3A4.2 4.2 0 007.5 14z" {...S} />
      <path d="M13 14l-2.5 4h3L11 22" {...S} />
    </>
  ),
};

/** Previsioni per una partita programmata; niente richiesta se non c'è un circolo o un orario */
export function useMatchWeather(matchId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['weather', matchId],
    queryFn: () => api<{ weather: MatchWeather | null }>(`/api/matches/${matchId}/weather`),
    enabled,
    staleTime: 30 * 60_000,
  });
}

/** Riga del meteo: icona, tempo e temperatura, pioggia e vento. `compact` eredita i colori del riquadro in cui sta */
export function WeatherLine({ matchId, enabled, compact = false }: { matchId: string; enabled: boolean; compact?: boolean }) {
  const q = useMatchWeather(matchId, enabled);
  const w = q.data?.weather;
  if (!w) return null;
  const wet = w.rainChance >= 50 || w.kind === 'rain' || w.kind === 'storm' || w.kind === 'snow';
  return (
    <div className={`weather${compact ? ' compact' : ''}${wet ? ' wet' : ''}`} title="Previsioni Open-Meteo per il circolo, nelle 2 ore della partita">
      <svg width={compact ? 20 : 26} height={compact ? 20 : 26} viewBox="0 0 24 24" aria-hidden>
        {ICON[w.kind]}
      </svg>
      <span className="weather-main">
        {LABEL[w.kind]}, {w.temperature}°
      </span>
      <span className="weather-sub">
        pioggia {w.rainChance}%{!compact && `, vento ${w.wind} km/h`}
      </span>
      {!compact && (
        <span style={{ marginLeft: 'auto' }}>
          <HelpLink to="meteo" label="meteo" />
        </span>
      )}
    </div>
  );
}
