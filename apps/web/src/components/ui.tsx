// Componenti di base riusati da tutte le schermate.

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import type { MatchStatus, Zone } from '@tentennis/shared';
import type { Match, Player } from '../api';
import { useLogout } from '../account';
import { bootVisible } from '../boot';
import { SeasonPicker } from './SeasonPicker';
import { iosInstallHint, isMobileDevice, useInstall } from '../pwa';
import { avatarColors, initials, STATUS_STYLE, useMe, ZONE_STYLE } from '../data';

/** Logo TennIsLove: cuore a forma di pallina da tennis. `inverted` per gli sfondi scuri: riquadro un po' più chiaro */
export function Logo({ size = 38, inverted = false }: { size?: number; inverted?: boolean }) {
  const clip = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flex: 'none' }} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d="M20 33.2S7.4 25.4 4.3 17.8C1.9 11.2 6.1 4.4 12.6 4.4c3.3 0 5.8 1.6 7.4 4 1.6-2.4 4.1-4 7.4-4 6.5 0 10.7 6.8 8.3 13.4C32.6 25.4 20 33.2 20 33.2z" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="11" fill={inverted ? '#16303D' : '#0B1A24'} />
      <g clipPath={`url(#${clip})`}>
        <rect width="40" height="40" fill="#E2CB58" />
        <circle cx="14" cy="13" r="21" fill="none" stroke="#135E52" strokeOpacity=".18" strokeWidth="9" />
        <path d="M5.5 6.5C10 12.5 30 12.5 34.5 6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9 31C12.5 22.5 27.5 22.5 31 31" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </g>
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

/** Zona di classifica; `final` a torneo concluso: le posizioni non sono più provvisorie */
export function ZonePill({ zone, qualifiers, final = false }: { zone: Zone; qualifiers: number; final?: boolean }) {
  const s = ZONE_STYLE[zone];
  const label = s.label.replace('8', String(qualifiers));
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg, border: s.border, fontSize: 10.5, padding: '2px 8px' }}>
      {final ? label.replace(' provv.', '') : label}
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
    to: '/pronostici',
    label: 'Pronostici',
    icon: (
      <>
        <circle cx="12" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M7 20.5h10l-1.6-3.2H8.6z" fill="currentColor" />
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
];

/**
 * Barra delle sezioni: in basso sul telefono, scorrevole in orizzontale (le voci non ci stanno tutte);
 * laterale su desktop. Lo sfumato ai bordi dice che c'è altro da scorrere.
 */
export function TabBar() {
  const ref = useRef<HTMLElement>(null);
  const { pathname, state } = useLocation();
  // arrivati dal gestionale con il tasto della barra laterale: la barra sfuma dal viola al blu
  const switched = (state as { switched?: boolean } | null)?.switched === true;
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  // la voce della pagina aperta resta in vista
  useEffect(() => {
    ref.current?.querySelector('a.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    updateEdges();
  }, [pathname, updateEdges]);
  useEffect(() => {
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);
  return (
    <nav ref={ref} className={`tabbar${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}${switched ? ' switched' : ''}`} onScroll={updateEdges}>
      <div className="tabbar-brand">
        <Logo size={34} inverted />
        <span className="title brand">TennIsLove</span>
      </div>
      <SeasonPicker className="tabbar-season" />
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            {t.icon}
          </svg>
          {t.label}
        </NavLink>
      ))}
      <TabBarFoot />
    </nav>
  );
}

/**
 * In fondo alla barra laterale (solo desktop): guida ed esci. Anche nel gestionale, senza la guida.
 * Qui c'è l'unico passaggio tra sito e gestionale (D-036): "Gestionale" per gli admin, "Sito" per gli admin che giocano.
 */
export function TabBarFoot({ place = 'app' }: { place?: 'app' | 'admin' }) {
  const logout = useLogout();
  const me = useMe().data;
  const switchTo = place === 'app' ? (me?.isAdmin ? { to: '/admin', label: 'Gestionale' } : null) : me?.playerId ? { to: '/', label: 'Sito' } : null;
  return (
    <div className="tabbar-foot">
      {place === 'app' && (
        <NavLink to="/guida">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M9.6 9.6a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2M12 17h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Guida
        </NavLink>
      )}
      {/* terzo dal basso in tutte e due le barre: passando da una all'altra resta fermo */}
      {switchTo && (
        <Link to={switchTo.to} state={{ switched: true }} className="switch-area">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <path d="M4 8h13M13.5 4.5L17 8l-3.5 3.5M20 16H7M10.5 12.5L7 16l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {switchTo.label}
        </Link>
      )}
      <button onClick={() => logout.mutate()} disabled={logout.isPending}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <path d="M14 4.5H7a2 2 0 00-2 2v11a2 2 0 002 2h7M11 12h9M16.5 8.5L20 12l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Esci
      </button>
    </div>
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

/** Il loader dell'app: il cuore-pallina che rimbalza (public/loader.svg) */
export function HeartLoader({ width = 72 }: { width?: number }) {
  return <img src="/loader.svg" alt="" aria-hidden width={width} style={{ display: 'block' }} />;
}

/** Nei pulsanti mentre l'azione è in corso, al posto di "Invio…" o "Salvataggio…" */
export function ButtonLoader({ height = 30 }: { height?: number }) {
  return <img src="/loader.svg" alt="In corso" style={{ height, margin: '-6px 0' }} />;
}

/**
 * Attesa a tutto schermo prima della prima pagina. All'avvio copre già la schermata di index.html, quindi non disegna niente;
 * se serve più tardi (es. dopo un nuovo login) mostra lo stesso cuore su sfondo scuro.
 */
export function Splash() {
  if (bootVisible()) return null;
  return (
    <div className="boot">
      <img className="in" src="/loader.svg" alt="" />
    </div>
  );
}

/** Attesa dentro l'app: il cuore che rimbalza, solo dopo 250 ms così le risposte veloci non fanno lampeggiare niente */
export function Loading() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="center-state" aria-busy="true" aria-label="Caricamento">
      {show && <HeartLoader />}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return <div className="center-state">{error instanceof Error ? error.message : 'Qualcosa è andato storto'}</div>;
}

/** Campo di testo con l'etichetta dentro, che sale sul bordo al focus o quando c'è un valore */
export function TextField({
  label,
  error = false,
  fieldStyle,
  placeholder,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean; fieldStyle?: CSSProperties }) {
  // date e ore mostrano sempre un formato: l'etichetta resta in alto
  const floated = input.type === 'date' || input.type === 'time';
  return (
    <label className={`float-field${floated ? ' floated' : ''}${error ? ' has-error' : ''}`} style={fieldStyle}>
      {/* serve un placeholder, anche vuoto, per sapere con :placeholder-shown se il campo è vuoto */}
      <input className="input" placeholder={placeholder ?? ' '} {...input} />
      <span>{label}</span>
    </label>
  );
}

/** Contenuto che si apre e si chiude con un'animazione di altezza (accordion) */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`collapse${open ? ' open' : ''}`}>
      {/* chiuso, il contenuto resta montato per l'animazione ma non si raggiunge col tab */}
      <div {...(open ? {} : { inert: '' })}>{children}</div>
    </div>
  );
}

/** Freccia degli accordion: ruota quando la sezione è aperta */
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`chevron${open ? ' open' : ''}`} width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M4.5 7l4.5 4.5L13.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Chiusura animata di fogli e finestre: `close` aggiunge la classe `closing`,
 * aspetta la fine dell'animazione e solo allora chiama `onClose`.
 */
export function useClosing(onClose: () => void, ms = 220) {
  const [closing, setClosing] = useState(false);
  const pending = useRef(false);
  const close = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setClosing(true);
    setTimeout(() => {
      onClose();
      pending.current = false;
      setClosing(false);
    }, ms);
  }, [onClose, ms]);
  return [closing, close] as const;
}

/**
 * "Installa l'app" sul telefono, quando si usa il browser e non l'app installata: un popup sopra la pagina,
 * che compare poco dopo l'apertura: sopra la barra in basso, oppure in alto (login, per non coprire il modulo).
 * La × lo chiude solo per questa visita: a ogni apertura ricompare, finché l'app non è installata.
 */
export function InstallBanner({ aboveTabs = false, atTop = false }: { aboveTabs?: boolean; atTop?: boolean }) {
  const install = useInstall();
  const [help, setHelp] = useState(false);
  // arriva dopo la schermata di avvio, non insieme alla pagina
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const [hidden, setHidden] = useState(false);
  if (!ready || hidden || !install.available || !isMobileDevice()) return null;
  return (
    <div className={`install-popup${aboveTabs ? ' above-tabs' : ''}${atTop ? ' at-top' : ''}`} role="dialog" aria-label="Installa l'app">
      <div className="install-row">
        <Logo size={34} />
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14.5 }}>Installa l'app</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (install.prompt) return install.prompt();
            // iPhone: si apre il menu Condividi e sotto resta scritto cosa scegliere
            setHelp(install.share ? true : !help);
            install.share?.();
          }}
        >
          Installa
        </button>
        <button className="icon-btn" aria-label="Chiudi" onClick={() => setHidden(true)} style={{ width: 32, height: 32 }}>
          ×
        </button>
      </div>
      <Collapse open={help}>
        <div className="muted" style={{ padding: '2px 4px 4px', fontSize: 13 }}>
          {iosInstallHint()}
        </div>
      </Collapse>
    </div>
  );
}

/** Vero se la media query è soddisfatta; si aggiorna quando si ridimensiona la finestra */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Schermi da desktop: stessa soglia del CSS (900 px) */
export const useDesktop = () => useMediaQuery('(min-width: 900px)');

/**
 * Blocca lo scorrimento della pagina sotto una finestra. Se la pagina ha la barra di scorrimento,
 * ne riserva prima lo spazio (gutter): togliendola, il contenuto e la finestra non si spostano.
 */
export function lockPageScroll() {
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  if (scrollbar > 0) {
    // i browser senza scrollbar-gutter (Safari prima della 18.2) riservano lo spazio con un margine interno
    if (CSS.supports('scrollbar-gutter', 'stable')) root.style.scrollbarGutter = 'stable';
    else root.style.paddingRight = `${scrollbar}px`;
  }
  root.style.overflow = 'hidden';
  return () => {
    root.style.overflow = '';
    root.style.scrollbarGutter = '';
    root.style.paddingRight = '';
  };
}

/** Punto interrogativo accanto a una funzione: porta alla sua spiegazione nella guida (D-067) */
export function HelpLink({ to, label, onDark = false }: { to: string; label: string; onDark?: boolean }) {
  return (
    <Link to={`/guida#${to}`} className={`help-link${onDark ? ' on-dark' : ''}`} aria-label={`Come funziona: ${label}`} title="Come funziona">
      ?
    </Link>
  );
}
