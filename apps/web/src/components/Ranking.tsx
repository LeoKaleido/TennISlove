// Classifica a righe attaccate, usata per il torneo e per i pronostici.

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Player } from '../api';
import { Avatar, Chevron, Collapse } from './ui';

export function RankingList({ children }: { children: ReactNode }) {
  return <div className="card rank-list">{children}</div>;
}

/**
 * Riga di classifica: posizione, giocatore, riga sotto il nome e punti.
 * Con `details` la riga si apre a fisarmonica e il profilo si raggiunge da lì; senza, porta al profilo.
 */
export function RankingRow({
  player,
  position,
  points,
  sub,
  highlight = false,
  details,
  open = false,
  onToggle,
}: {
  player: Player;
  position: number;
  points: number;
  sub?: ReactNode;
  highlight?: boolean;
  details?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span style={{ width: 24, fontWeight: 900, fontStretch: '70%', fontSize: 24 }}>{position}</span>
      <Avatar player={player} size={36} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {player.firstName} {player.lastName}
        </span>
        {sub && <span>{sub}</span>}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 900, fontStretch: '70%', fontSize: 28, lineHeight: 1 }}>{points}</span>
        <span className="faint" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
          punti
        </span>
      </span>
    </>
  );
  const background = highlight ? 'color-mix(in oklch, var(--mint) 28%, var(--surface))' : undefined;

  if (!details) {
    return (
      <Link to={`/giocatori/${player.id}`} className="list-row" style={{ background }}>
        {content}
      </Link>
    );
  }
  return (
    <div style={{ background }}>
      <button className="list-row" onClick={onToggle}>
        {content}
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        {details}
        <Link to={`/giocatori/${player.id}`} className="btn" style={{ width: '100%', height: 42, borderRadius: 0, borderTop: '1px solid var(--line)', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
          Apri profilo
        </Link>
      </Collapse>
    </div>
  );
}

/** Separatore tra le righe, es. la linea di taglio */
export function RankingDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
      <span style={{ flex: 1, borderTop: '2px solid var(--accent)' }} />
      {label}
      <span style={{ flex: 1, borderTop: '2px solid var(--accent)' }} />
    </div>
  );
}
