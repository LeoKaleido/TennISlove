import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { MatchRow } from '../components/MatchRow';
import { Avatar, BackButton, ErrorState, Loading } from '../components/ui';
import { isMine, opponentOf, playerIndex, useMe, useSeason, ZONE_STYLE } from '../data';
import { getTheme, setTheme, type Theme } from '../theme';

export function ProfilePage() {
  const params = useParams<{ id?: string }>();
  const me = useMe();
  const season = useSeason();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'next' | 'played'>('next');
  const [theme, setThemeState] = useState<Theme>(getTheme());

  const logout = useMutation({
    mutationFn: () => api('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const playerId = params.id ?? me.data?.playerId;
  const isMe = !params.id || params.id === me.data?.playerId;
  const players = playerIndex(data.players);
  const p = playerId ? players.get(playerId) : undefined;

  const themeButton = (
    <button
      className="btn btn-outline"
      style={{ height: 50, justifyContent: 'space-between', padding: '0 16px', fontSize: 14.5 }}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        setThemeState(next);
      }}
    >
      <span>Tema</span>
      <span className="muted">{theme === 'dark' ? 'Scuro' : 'Chiaro'}</span>
    </button>
  );
  const logoutButton = (
    <button className="btn btn-outline" style={{ height: 50, color: 'var(--errFg)', fontSize: 14.5 }} onClick={() => logout.mutate()}>
      Esci
    </button>
  );

  // Account solo amministratore, senza giocatore
  if (!p) {
    return (
      <div className="screen">
        <div className="page-head">
          <h1 className="display">Profilo</h1>
          <div className="sub">{me.data?.email}</div>
        </div>
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {themeButton}
          {logoutButton}
        </div>
      </div>
    );
  }

  const row = data.standings.find((s) => s.playerId === p.id);
  const mine = data.matches.filter((m) => isMine(m, p.id) && m.phase === 'ROUND_ROBIN');
  const next = mine.filter((m) => !m.result).sort((x, y) => x.round - y.round);
  const played = mine.filter((m) => m.result).sort((x, y) => y.round - x.round);
  const list = tab === 'next' ? next : played;

  const h2h = data.players
    .filter((o) => o.id !== p.id)
    .map((o) => {
      const m = mine.find((x) => opponentOf(x, p.id) === o.id);
      const r = m?.result;
      let res = 'Da giocare';
      let color = 'var(--ink3)';
      if (r && m) {
        const meA = m.playerAId === p.id;
        const myPts = meA ? r.pointsA : r.pointsB;
        const oppPts = meA ? r.pointsB : r.pointsA;
        const won = r.winner === (meA ? 'A' : 'B');
        const lost = r.winner === (meA ? 'B' : 'A');
        res = `${won ? 'Vinta' : lost ? 'Persa' : 'Senza esito'} ${myPts}-${oppPts}`;
        color = won ? 'var(--accent)' : lost ? 'var(--errFg)' : 'var(--ink2)';
      }
      return { o, m, res, color };
    });

  const stats = row
    ? [
        { v: row.points, l: 'Punti' },
        { v: row.played, l: 'Giocate' },
        { v: row.won, l: 'Vinte' },
        { v: row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff, l: 'Diff. game' },
      ]
    : [];

  return (
    <div className="screen">
      <div style={{ background: 'var(--hero)', color: '#fff', padding: '16px 16px 22px', display: 'flex', flexDirection: 'column', gap: 16, borderRadius: '0 0 28px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 }}>
          {!isMe ? <BackButton /> : <span />}
          <span className="kicker" style={{ color: '#C6EEDB' }}>
            {isMe ? 'Il tuo profilo' : 'Giocatore'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ borderRadius: 28, boxShadow: '0 0 0 3px #C6EEDB', overflow: 'hidden' }}>
            <Avatar player={p} size={92} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span className="display" style={{ fontSize: 34 }}>
              {p.firstName}
              <br />
              {p.lastName}
            </span>
            {row && (
              <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)' }}>
                {row.position}° in classifica, {row.points} punti
              </span>
            )}
            {row && (
              <span>
                <span className="pill" style={{ background: '#C6EEDB', color: '#0B1A24', fontSize: 11 }}>
                  {ZONE_STYLE[row.zone].label.replace('8', String(data.season.qualifiers))}
                </span>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {stats.map((s) => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontWeight: 900, fontStretch: '70%', fontSize: 24 }}>{s.v}</span>
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.7)', textAlign: 'center' }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="segmented">
          {(
            [
              ['next', 'Da giocare', next.length],
              ['played', 'Giocate', played.length],
            ] as const
          ).map(([key, label, n]) => (
            <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)} style={{ height: 42 }}>
              {label}
              <span
                style={{
                  minWidth: 24,
                  height: 22,
                  padding: '0 7px',
                  borderRadius: 99,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  background: tab === key ? 'var(--accent)' : 'var(--mint)',
                  color: tab === key ? 'var(--onAccent)' : 'var(--mintInk)',
                }}
              >
                {n}
              </span>
            </button>
          ))}
        </div>
        <div className="card">
          {list.map((m) => (
            <MatchRow key={m.id} match={m} data={data} title={`G${m.round} vs ${players.get(opponentOf(m, p.id))!.shortName}`} />
          ))}
          {list.length === 0 && (
            <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 13.5 }}>
              {tab === 'next' ? 'Nessuna partita da giocare.' : 'Nessuna partita giocata finora.'}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="title" style={{ fontSize: 22, padding: '0 2px' }}>
          Scontri diretti
        </h2>
        <div className="card">
          {h2h.map(({ o, m, res, color }) => (
            <Link key={o.id} to={m ? `/partite/${m.id}` : `/giocatori/${o.id}`} className="list-row" style={{ padding: '9px 14px' }}>
              <Avatar player={o} size={30} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>{o.shortName}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{res}</span>
            </Link>
          ))}
        </div>
      </div>

      {isMe && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {themeButton}
          {logoutButton}
        </div>
      )}
    </div>
  );
}
