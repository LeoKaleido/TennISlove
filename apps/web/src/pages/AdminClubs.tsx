// Gestionale: circoli dove si gioca.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ButtonLoader, ErrorState, Loading, TextField, useClosing, useToast } from '../components/ui';

interface ClubRow {
  id: string;
  name: string;
  city: string | null;
  mapsUrl: string | null;
  active: boolean;
  matches: number;
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {clubs.data.map((c) => (
          <div key={c.id} className="card" style={{ borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, opacity: c.active ? 1 : 0.55 }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {c.city ?? 'Città non indicata'}
              {!c.active && ', non attivo'}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{c.matches === 1 ? '1 partita' : `${c.matches} partite`}</span>
              <button className="link-btn" style={{ color: 'var(--ink2)' }} onClick={() => setEditing(c)}>
                Modifica
              </button>
            </div>
          </div>
        ))}
      </div>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name, city: city || null, mapsUrl: mapsUrl || null, active };
      return club ? api(`/api/admin/clubs/${club.id}`, { method: 'PATCH', body }) : api('/api/admin/clubs', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
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
