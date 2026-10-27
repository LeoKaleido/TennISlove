// Gestionale: moderazione delle foto caricate dai giocatori.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { formatDayWithWeekday, romeDay } from '@tentennis/shared';
import { api, type SeasonOverview } from '../api';
import { AdminHeader } from '../components/AdminHeader';
import { ErrorState, Loading, useToast } from '../components/ui';
import { playerIndex } from '../data';
import { useGallery } from './Gallery';

export function AdminPhotos({ data, picker }: { data: SeasonOverview; picker: ReactNode }) {
  const gallery = useGallery(data.season.id);
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/photos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Foto eliminata');
    },
    onError: (e) => toast(e.message),
  });

  if (gallery.isLoading) return <Loading />;
  if (!gallery.data) return <ErrorState error={gallery.error} />;
  const players = playerIndex(data.players);
  const name = (id: string) => players.get(id)?.shortName ?? '?';

  return (
    <>
      <AdminHeader title="Foto" sub={gallery.data.photos.length === 1 ? '1 foto' : `${gallery.data.photos.length} foto`} aside={picker} />
      {gallery.data.photos.length === 0 ? (
        <div className="muted" style={{ padding: 18, borderRadius: 18, border: '1.5px dashed var(--line2)', fontSize: 13.5 }}>
          Nessuna foto caricata.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {gallery.data.photos.map((p) => (
            <div key={p.id} className="card" style={{ borderRadius: 16 }}>
              <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '1', background: `var(--surface2) url(${p.url}) center/cover` }} aria-label="Apri la foto" />
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {name(p.playerAId)} vs {name(p.playerBId)}
                </span>
                <span className="faint" style={{ fontSize: 11.5 }}>
                  Giornata {p.round}, {formatDayWithWeekday(romeDay(p.createdAt))}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--errFg)' }}
                  disabled={remove.isPending}
                  onClick={() => window.confirm('Eliminare questa foto?') && remove.mutate(p.id)}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
