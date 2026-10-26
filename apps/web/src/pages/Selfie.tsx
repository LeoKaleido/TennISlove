// "Foto della partita": scatta o scegli una o più foto, scegli la copertina, carica (D-011, D-021).

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, type MatchDetail } from '../api';
import { BackButton, ButtonLoader, ErrorState, Loading, useToast } from '../components/ui';
import { playerIndex, useMe, useSeason } from '../data';
import { compressImage, uploadImage } from '../photos';

interface Draft {
  key: string;
  file: File;
  preview: string;
}

export function SelfiePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useMe();
  const season = useSeason();
  const detail = useQuery({ queryKey: ['match', id], queryFn: () => api<MatchDetail>(`/api/matches/${id}`) });
  const queryClient = useQueryClient();
  const toast = useToast();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  // copertina scelta: id di una foto già caricata oppure key di una nuova
  const [cover, setCover] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // libera le anteprime quando si lascia la pagina
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  useEffect(() => () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.preview)), []);

  if (detail.isLoading || season.isLoading) return <Loading />;
  if (!detail.data || !season.data) return <ErrorState error={detail.error ?? season.error} />;
  const { match: m, photos } = detail.data;
  const players = playerIndex(season.data.players);
  const a = players.get(m.playerAId)!;
  const b = players.get(m.playerBId)!;
  const currentCover = photos.find((p) => m.coverPhotoUrl === p.url)?.id ?? null;
  const chosenCover = cover ?? currentCover ?? drafts[0]?.key ?? null;
  const isPlayer = me.data?.playerId === m.playerAId || me.data?.playerId === m.playerBId;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...files].filter((f) => f.type.startsWith('image/')).map((file) => ({ key: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file) }));
    setDrafts((d) => [...d, ...next]);
  };

  const save = async () => {
    try {
      const uploaded = new Map<string, string>();
      for (const [i, d] of drafts.entries()) {
        setSaving(drafts.length > 1 ? `${i + 1} di ${drafts.length}` : '');
        const blob = await compressImage(d.file);
        const res = await uploadImage<{ photoId: string }>(`/api/matches/${m.id}/photos`, blob);
        uploaded.set(d.key, res.photoId);
      }
      const coverId = chosenCover ? (uploaded.get(chosenCover) ?? chosenCover) : null;
      if (coverId && coverId !== currentCover) await api(`/api/matches/${m.id}/cover`, { method: 'PUT', body: { photoId: coverId } });
      await queryClient.invalidateQueries();
      toast(drafts.length ? (drafts.length === 1 ? 'Foto caricata' : `${drafts.length} foto caricate`) : 'Copertina aggiornata');
      navigate(`/partite/${m.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Caricamento non riuscito');
      setSaving(null);
    }
  };

  const items = [
    ...photos.map((p) => ({ key: p.id, src: p.url, isNew: false })),
    ...drafts.map((d) => ({ key: d.key, src: d.preview, isNew: true })),
  ];
  const changed = drafts.length > 0 || (chosenCover !== null && chosenCover !== currentCover);

  if (!isPlayer) return <ErrorState error={new Error('Solo i giocatori della partita possono caricare foto')} />;

  return (
    <div className="screen" style={{ gap: 0, paddingBottom: 0 }}>
      <div className="sticky-header">
        <BackButton />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span className="title" style={{ fontSize: 21 }}>
            Foto della partita
          </span>
          <span className="muted ellipsis" style={{ fontSize: 12.5 }}>
            {a.shortName} vs {b.shortName}, giornata {m.round}
          </span>
        </div>
      </div>

      <div style={{ padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={cameraInput} type="file" accept="image/*" capture="user" hidden onChange={(e) => addFiles(e.target.files)} />
        <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={() => cameraInput.current?.click()} className="btn btn-dark" style={{ height: 112, borderRadius: 22, flexDirection: 'column', gap: 10, fontSize: 15 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <rect x="3" y="9" width="28" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <circle cx="17" cy="19" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <rect x="12" y="5" width="10" height="5" rx="2" fill="currentColor" />
            </svg>
            Scatta selfie
          </button>
          <button onClick={() => galleryInput.current?.click()} className="btn btn-outline" style={{ height: 112, borderRadius: 22, flexDirection: 'column', gap: 10, fontSize: 15, fontWeight: 800 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <rect x="4" y="6" width="26" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <circle cx="12" cy="13" r="3" fill="currentColor" />
              <path d="M5 25l8-7 6 5 4-3 7 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            </svg>
            Dalla galleria
          </button>
        </div>

        {items.length > 0 ? (
          <>
            <div className="section-head">
              <span className="title" style={{ fontSize: 18 }}>
                Anteprima
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {items.map((it) => {
                const isCover = chosenCover === it.key;
                return (
                  <div
                    key={it.key}
                    style={{ aspectRatio: '3/4', borderRadius: 18, background: `url(${it.src}) center/cover`, position: 'relative', overflow: 'hidden', boxShadow: isCover ? '0 0 0 3px var(--accent)' : undefined }}
                  >
                    <button
                      onClick={() => setCover(it.key)}
                      style={{ position: 'absolute', left: 8, bottom: 8, height: 32, padding: '0 10px', borderRadius: 99, border: 0, fontSize: 12, fontWeight: 800, background: isCover ? 'var(--accent)' : 'rgba(11,26,36,.75)', color: isCover ? 'var(--onAccent)' : '#fff' }}
                    >
                      {isCover ? '★ Copertina' : '☆ Copertina'}
                    </button>
                    {it.isNew ? (
                      <button
                        aria-label="Togli questa foto"
                        onClick={() => {
                          URL.revokeObjectURL(it.src);
                          setDrafts(drafts.filter((d) => d.key !== it.key));
                        }}
                        style={{ position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: '50%', border: 0, background: 'rgba(11,26,36,.75)', color: '#fff', fontSize: 16 }}
                      >
                        ×
                      </button>
                    ) : (
                      <span style={{ position: 'absolute', right: 8, top: 8, padding: '3px 7px', borderRadius: 6, background: 'rgba(11,26,36,.75)', color: '#fff', fontSize: 10.5, fontWeight: 700 }}>Già caricata</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="muted" style={{ padding: 24, borderRadius: 18, border: '1.5px dashed var(--line2)', textAlign: 'center', fontSize: 13.5 }}>
            Nessuna foto
          </div>
        )}
      </div>

      <div className="sticky-footer">
        <button className="btn btn-primary" disabled={!changed || saving !== null} onClick={save}>
          {saving !== null ? (
            <>
              <ButtonLoader /> {saving}
            </>
          ) : (drafts.length ? `Carica ${drafts.length === 1 ? 'la foto' : `${drafts.length} foto`}` : 'Salva copertina')}
        </button>
      </div>
    </div>
  );
}
