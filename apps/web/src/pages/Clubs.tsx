// Circoli del torneo (D-079): dove si gioca, con telefono per prenotare, mappa e superfici.

import { SURFACE_LABEL } from '@tentennis/shared';
import { ErrorState, Loading } from '../components/ui';
import { useSeason } from '../data';

export function ClubsPage() {
  const season = useSeason();
  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const { clubs, matches } = season.data;
  // partite del torneo giocate o in programma in ogni circolo
  const count = (id: string) => matches.filter((m) => m.clubId === id && (m.result || m.scheduledAt)).length;

  return (
    <div className="screen" style={{ gap: 14 }}>
      <div className="page-head">
        <h1 className="display">Circoli</h1>
        <div className="sub">Si può giocare anche in un campo non in lista.</div>
      </div>
      <div className="pad clubs-grid">
        {clubs.map((c) => {
          const n = count(c.id);
          return (
            <div key={c.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="title" style={{ fontSize: 20, lineHeight: 1.1 }}>
                  {c.name}
                </span>
                {c.city && (
                  <span className="muted" style={{ fontSize: 13.5 }}>
                    {c.city}
                  </span>
                )}
              </div>
              {c.description && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--ink2)' }}>{c.description}</p>}
              {(c.surfaces.length > 0 || n > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {c.surfaces.map((s) => (
                    <span key={s} style={{ padding: '4px 10px', borderRadius: 99, background: 'var(--surface2)', fontSize: 12.5, fontWeight: 700 }}>
                      {SURFACE_LABEL[s]}
                    </span>
                  ))}
                  {n > 0 && (
                    <span className="faint" style={{ fontSize: 12.5 }}>
                      {n === 1 ? '1 partita' : `${n} partite`} in questo torneo
                    </span>
                  )}
                </div>
              )}
              {(c.phone || c.mapsUrl) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                  {c.phone && (
                    <a className="btn btn-primary" href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`} style={{ flex: '1 1 140px', height: 44, fontSize: 14 }}>
                      Chiama {c.phone}
                    </a>
                  )}
                  {c.mapsUrl && (
                    <a className="btn btn-outline" href={c.mapsUrl} target="_blank" rel="noreferrer" style={{ flex: '1 1 100px', height: 44, fontSize: 14 }}>
                      Mappa
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
