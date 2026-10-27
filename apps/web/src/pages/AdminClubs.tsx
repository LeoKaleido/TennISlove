// Gestionale: circoli dove si gioca.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SURFACE_LABEL, SURFACES, type Surface } from '@tentennis/shared';
import { api } from '../api';
import { IconAction } from '../components/AdminTable';
import { ButtonLoader, ErrorState, Loading, TextField, useClosing, useToast } from '../components/ui';

interface ClubRow {
  id: string;
  name: string;
  city: string | null;
  mapsUrl: string | null;
  active: boolean;
  matches: number;
  /** posizione per il meteo ricavata dal link o dalla città (D-065) */
  located: boolean;
  /** superfici dei campi (D-075) */
  surfaces: Surface[];
}

export function AdminClubs() {
  const clubs = useQuery({ queryKey: ['admin-clubs'], queryFn: () => api<ClubRow[]>('/api/admin/clubs') });
  const [editing, setEditing] = useState<ClubRow | 'new' | null>(null);
  if (clubs.isLoading) return <Loading />;
  if (!clubs.data) return <ErrorState error={clubs.error} />;

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
            Circoli
          </h1>
        </div>
        <button className="btn btn-primary" style={{ height: 44, fontSize: 14 }} onClick={() => setEditing('new')}>
          + Nuovo circolo
        </button>
      </div>
      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Circolo</th>
              <th>Città</th>
              <th>Superfici</th>
              <th>Meteo</th>
              <th>Partite</th>
              <th>Stato</th>
              <th className="actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clubs.data.map((c) => (
              <tr key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                <td style={{ fontWeight: 700 }}>{c.name}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {c.city ?? '-'}
                </td>
                <td style={{ fontSize: 12.5, color: c.surfaces.length ? 'var(--ink2)' : 'var(--warnFg)', fontWeight: c.surfaces.length ? 400 : 600 }}>
                  {c.surfaces.length ? c.surfaces.map((s) => SURFACE_LABEL[s]).join(', ') : 'Da indicare'}
                </td>
                <td style={{ fontSize: 12.5, fontWeight: 600, color: c.located ? 'var(--accent)' : 'var(--warnFg)' }}>
                  {c.located ? 'Disponibile' : 'Posizione non trovata'}
                </td>
                <td style={{ fontSize: 13 }}>{c.matches}</td>
                <td style={{ fontSize: 12.5, fontWeight: 600, color: c.active ? 'var(--ink2)' : 'var(--ink3)' }}>{c.active ? 'Attivo' : 'Non attivo'}</td>
                <td className="actions">
                  <span className="icon-actions">
                    <IconAction icon="edit" tip="Modifica" onClick={() => setEditing(c)} />
                    {c.mapsUrl && <IconAction icon="map" tip="Apri su Google Maps" href={c.mapsUrl} />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {clubs.data.some((c) => !c.located) && (
        <span className="faint" style={{ fontSize: 12.5, marginTop: -8 }}>
          Meteo non disponibile: la posizione non si ricava né dal link né dalla città. Controlla il link di Google Maps o indica la città.
        </span>
      )}
      {editing && <ClubDialog club={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ClubDialog({ club, onClose }: { club: ClubRow | null; onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(club?.name ?? '');
  const [city, setCity] = useState(club?.city ?? '');
  const [mapsUrl, setMapsUrl] = useState(club?.mapsUrl ?? '');
  const [active, setActive] = useState(club?.active ?? true);
  const [surfaces, setSurfaces] = useState<Surface[]>(club?.surfaces ?? []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name, city: city || null, mapsUrl: mapsUrl || null, active, surfaces };
      return club ? api(`/api/admin/clubs/${club.id}`, { method: 'PATCH', body }) : api('/api/admin/clubs', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      // la posizione per il meteo si ricava in sottofondo: si ricontrolla dopo qualche secondo
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-clubs'] }), 5000);
      toast(club ? 'Circolo aggiornato' : 'Circolo aggiunto');
      close();
    },
    onError: (e) => toast(e.message),
  });

  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={club ? 'Modifica circolo' : 'Nuovo circolo'}>
      <div className="modal-backdrop" onClick={close} />
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display" style={{ fontSize: 32 }}>
            {club ? 'Modifica circolo' : 'Nuovo circolo'}
          </h2>
          <button type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <TextField label="Nome" style={{ height: 48 }} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField label="Città" style={{ height: 48 }} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <TextField label="Link Google Maps" style={{ height: 48 }} type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/…" />
        <span className="faint" style={{ fontSize: 12.5, marginTop: -6 }}>
          Dal link (o, se non basta, dalla città) si ricava la posizione per il meteo delle partite.
        </span>
        <div className="field">
          <span>Superfici dei campi</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SURFACES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={surfaces.includes(s)}
                onClick={() => setSurfaces(surfaces.includes(s) ? surfaces.filter((x) => x !== s) : SURFACES.filter((x) => x === s || surfaces.includes(x)))}
              >
                {SURFACE_LABEL[s]}
              </button>
            ))}
          </div>
          <span className="faint" style={{ fontSize: 12.5 }}>
            Programmando una partita in questo circolo i giocatori scelgono tra queste; se è una sola, viene messa da sola.
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14.5 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18 }} />
          Attivo
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={close}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" style={{ height: 46, fontSize: 14 }} disabled={!name.trim() || save.isPending}>
            {save.isPending ? <ButtonLoader /> : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
}
