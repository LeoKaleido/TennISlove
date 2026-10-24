// Componenti di base riusati da tutte le schermate.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { MatchStatus, Zone } from '@tentennis/shared';
import type { Match, Player } from '../api';
import { avatarColors, initials, STATUS_STYLE, ZONE_STYLE } from '../data';

export function Logo({ size = 38, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#C6EEDB' : '#0B1A24';
  const fg = inverted ? '#0B1A24' : '#C6EEDB';
  const ball = inverted ? '#1F6F54' : '#C6EEDB';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flex: 'none' }} aria-hidden>
      <rect width="40" height="40" rx="11" fill={bg} />
      <ellipse cx="17" cy="15" rx="7.5" ry="9.5" transform="rotate(-35 17 15)" fill="none" stroke={fg} strokeWidth="2.6" />
      <line x1="22.4" y1="22.8" x2="28" y2="30.6" stroke={fg} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="31" cy="10" r="3" fill={ball} />
      <circle cx="10.5" cy="31.5" r="3" fill={ball} />
    </svg>
  );
}

export function Avatar({ player, size = 36, ring }: { player: Player; size?: number; ring?: string }) {
  const c = avatarColors(player.id);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: player.photoUrl ? `url(${player.photoUrl}) center/cover` : c.bg,
        color: c.fg,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {player.photoUrl ? null : initials(player)}
    </span>
  );
}

export function StatusPill({ status }: { status: MatchStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg, border: s.border }}>
      {s.label}
    </span>
  );
}

export function ZonePill({ zone, qualifiers }: { zone: Zone; qualifiers: number }) {
  const s = ZONE_STYLE[zone];
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg, border: s.border, fontSize: 10.5, padding: '2px 8px' }}>
      {s.label.replace('8', String(qualifiers))}
    </span>
  );
}

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button className="icon-btn" aria-label="Indietro" onClick={() => (to ? navigate(to) : navigate(-1))}>
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Tabella punteggio: set 1, set 2, STB e punti per i due giocatori */
export function ScoreTable({ match, players, size = 'lg' }: { match: Match; players: Map<string, Player>; size?: 'sm' | 'lg' }) {
  const r = match.result;
  const rows = (['A', 'B'] as const).map((side) => {
    const p = players.get(side === 'A' ? match.playerAId : match.playerBId)!;
    const k = side === 'A' ? 'a' : 'b';
    const win = r?.winner === side;
    return {
      side,
      name: p.shortName,
      s1: r?.set1?.[k] ?? '-',
      s2: r?.set2?.[k] ?? '-',
      s3: r?.stb?.[k] ?? '-',
      pts: r ? (side === 'A' ? r.pointsA : r.pointsB) : '-',
      win,
    };
  });
  const big = size === 'lg';
  return (
    <div>
      {big && (
        <div className="score-grid score-head">
          <span />
          <span style={{ textAlign: 'center' }}>1°</span>
          <span style={{ textAlign: 'center' }}>2°</span>
          <span style={{ textAlign: 'center' }}>STB</span>
          <span style={{ textAlign: 'right' }}>Punti</span>
        </div>
      )}
      {rows.map((row) => (
        <div
          key={row.side}
          className="score-grid"
          style={{ padding: big ? '8px 0' : '2px 0', borderTop: big ? '1px solid var(--line)' : undefined }}
        >
          <span style={{ fontWeight: row.win ? 800 : 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: row.win ? 'var(--accent)' : 'transparent' }} />
            <span className="ellipsis">{row.name}</span>
          </span>
          {[row.s1, row.s2].map((v, i) => (
            <span key={i} style={{ textAlign: 'center', fontSize: big ? 20 : 15, fontWeight: row.win ? 800 : 500 }}>
              {v}
            </span>
          ))}
          <span style={{ textAlign: 'center', fontSize: big ? 16 : 13, color: 'var(--ink2)' }}>{row.s3}</span>
          <span
            className="pts-badge"
            style={{
              background: row.win ? 'var(--accent)' : 'var(--surface2)',
              color: row.win ? 'var(--onAccent)' : 'var(--ink)',
              fontSize: big ? 20 : 14,
              minWidth: big ? 44 : 36,
            }}
          >
            {row.pts}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { to: '/', label: 'Home', end: true, icon: <path d="M4 11L12 4l8 7v9H4z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /> },
  {
    to: '/calendario',
    label: 'Calendario',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2.2" />
      </>
    ),
  },
  {
    to: '/classifica',
    label: 'Classifica',
    icon: (
      <>
        <rect x="3.5" y="12" width="4.5" height="8" rx="1" fill="currentColor" />
        <rect x="9.75" y="5" width="4.5" height="15" rx="1" fill="currentColor" />
        <rect x="16" y="9" width="4.5" height="11" rx="1" fill="currentColor" />
      </>
    ),
  },
  {
    to: '/gallery',
    label: 'Gallery',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      </>
    ),
  },
  {
    to: '/profilo',
    label: 'Profilo',
    icon: (
      <>
        <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M4.5 20c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            {t.icon}
          </svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((m: string) => {
    clearTimeout(timer.current);
    setMsg(m);
    timer.current = setTimeout(() => setMsg(''), 2800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <div>{msg}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Loading() {
  return <div className="center-state">Caricamento…</div>;
}

export function ErrorState({ error }: { error: unknown }) {
  return <div className="center-state">{error instanceof Error ? error.message : 'Qualcosa è andato storto'}</div>;
}
