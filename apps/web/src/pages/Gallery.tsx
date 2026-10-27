import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { ErrorState, HelpLink, Loading, Logo } from '../components/ui';
import { playerIndex, useMe, useSeason, useSelectedSeasonId } from '../data';

export interface GalleryPhoto {
  id: string;
  url: string;
  createdAt: string;
  uploadedById: string;
  matchId: string;
  round: number;
  playerAId: string;
  playerBId: string;
}

/** Foto di un torneo; undefined = quello in corso */
export const useGallery = (seasonId: string | undefined) =>
  useQuery({
    queryKey: ['gallery', seasonId ?? 'current'],
    queryFn: () => api<{ photos: GalleryPhoto[] }>(seasonId ? `/api/gallery?season=${seasonId}` : '/api/gallery'),
  });

export function GalleryPage() {
  const me = useMe();
  const season = useSeason();
  const gallery = useGallery(useSelectedSeasonId());
  const [mineOnly, setMineOnly] = useState(false);

  if (season.isLoading || gallery.isLoading) return <Loading />;
  if (!season.data || !gallery.data) return <ErrorState error={season.error ?? gallery.error} />;
  const players = playerIndex(season.data.players);
  const myId = me.data?.playerId;
  const photos = gallery.data.photos.filter((p) => !mineOnly || p.playerAId === myId || p.playerBId === myId);

  return (
    <div className="screen" style={{ gap: 14 }}>
      <div className="page-head">
        <h1 className="display with-help">
          Gallery <HelpLink to="foto" label="foto e gallery" />
        </h1>
        <div className="sub">
          {gallery.data.photos.length} foto
        </div>
      </div>
      {myId && (
        <div className="pad">
          <div className="segmented">
            <button aria-pressed={!mineOnly} onClick={() => setMineOnly(false)}>
              Tutte
            </button>
            <button aria-pressed={mineOnly} onClick={() => setMineOnly(true)}>
              Le mie partite
            </button>
          </div>
        </div>
      )}
      {photos.length === 0 ? (
        <div className="center-state">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Logo size={56} />
            <div style={{ maxWidth: 280, lineHeight: 1.5 }}>Ancora nessuna foto</div>
          </div>
        </div>
      ) : (
        <div className="gallery-grid" style={{ padding: '0 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {photos.map((p) => (
            <Link key={p.id} to={`/partite/${p.matchId}`} style={{ aspectRatio: '1', borderRadius: 10, background: `var(--surface2) url(${p.url}) center/cover`, position: 'relative', overflow: 'hidden' }}>
              <span
                className="ellipsis"
                style={{ position: 'absolute', left: 5, right: 5, bottom: 5, padding: '3px 6px', borderRadius: 6, background: 'rgba(11,26,36,.78)', color: '#fff', fontSize: 10, fontWeight: 700 }}
              >
                {players.get(p.playerAId)?.shortName} vs {players.get(p.playerBId)?.shortName}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
