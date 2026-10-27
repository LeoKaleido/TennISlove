// Card del giocatore da condividere (D-062): anteprima, poi condivisione o download.

import { useEffect, useState } from 'react';
import { BADGE_ORDER, type BadgeId } from '@tentennis/shared';
import type { Player, SeasonOverview } from '../api';
import { BADGE_TIER, type BadgeTier } from '../badges';
import { drawPlayerCard } from '../card';
import { badgeLevel, useBadgesAcrossSeasons } from './Badges';
import { ButtonLoader, HeartLoader, HelpLink, useClosing, useToast } from './ui';

/** Condividi e Scarica affiancati: stessa misura, anche se uno è pieno e l'altro bordato */
const ACTION = { flex: 1, height: 50, fontSize: 15, borderRadius: 14 } as const;

const TIER_RANK: Record<BadgeTier, number> = { gold: 0, silver: 1, bronze: 2 };
const rank = (id: BadgeId) => (BADGE_TIER[id] ? TIER_RANK[BADGE_TIER[id]!] : 3);

export function ShareCardButton({ data, player }: { data: SeasonOverview; player: Player }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-dark" style={{ background: '#C6EEDB', color: '#0B1A24' }} onClick={() => setOpen(true)}>
        Condividi la tua card
      </button>
      {open && <CardModal data={data} player={player} onClose={() => setOpen(false)} />}
    </>
  );
}

function CardModal({ data, player, onClose }: { data: SeasonOverview; player: Player; onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const toast = useToast();
  const { list, loading } = useBadgesAcrossSeasons(player.id);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // badge ottenuti in qualunque torneo, i più prestigiosi per primi
  const earned = BADGE_ORDER.map((id) => ({ id, level: badgeLevel(list, id) }))
    .filter((b) => b.level > 0)
    .sort((a, b) => rank(a.id) - rank(b.id));
  const key = earned.map((b) => `${b.id}${b.level}`).join();

  useEffect(() => {
    if (loading) return;
    let objectUrl: string | null = null;
    drawPlayerCard(data, player, earned)
      .then((b) => {
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      })
      .catch((e: Error) => toast(e.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, key, data, player]);

  const fileName = `tennislove-${player.firstName}-${player.lastName}.png`.toLowerCase().replace(/\s+/g, '-');
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    setSharing(true);
    try {
      await navigator.share({ files: [file], title: 'TennIsLove' });
    } catch (e) {
      // chiudere il pannello di condivisione non è un errore
      if ((e as Error).name !== 'AbortError') toast('Condivisione non riuscita');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="La tua card">
      <div className="modal-backdrop" onClick={close} />
      <div className="modal" style={{ width: 'min(440px, 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display with-help" style={{ fontSize: 32 }}>
            La tua card <HelpLink to="card" label="la tua card" />
          </h2>
          <button type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>
        <div style={{ aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden', background: '#0B1A24', display: 'grid', placeItems: 'center' }}>
          {url ? <img src={url} alt="Anteprima della card" style={{ width: '100%', height: '100%', display: 'block' }} /> : <HeartLoader />}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canShare && (
            <button className="btn btn-primary" style={ACTION} onClick={share} disabled={sharing}>
              {sharing ? <ButtonLoader /> : 'Condividi'}
            </button>
          )}
          <a className={`btn ${canShare ? 'btn-outline' : 'btn-primary'}`} style={{ ...ACTION, pointerEvents: url ? undefined : 'none', opacity: url ? 1 : 0.5 }} href={url ?? undefined} download={fileName}>
            Scarica
          </a>
        </div>
      </div>
    </div>
  );
}
