import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDayWithWeekday, formatScore, romeDay } from '@tentennis/shared';
import { api, type Match, type SeasonOverview } from '../api';
import { AdminResultEditor } from '../components/AdminResultEditor';
import { AdminPlayers } from './AdminPlayers';
import { ErrorState, Loading, Logo, StatusPill, useToast } from '../components/ui';
import { matchInfo, playerIndex, useSeason } from '../data';

type Tab = 'dash' | 'results' | 'players';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dash', label: 'Dashboard' },
  { key: 'results', label: 'Risultati' },
  { key: 'players', label: 'Giocatori' },
];

export function AdminPage() {
  const season = useSeason();
  const [tab, setTab] = useState<Tab>('dash');
  const [editing, setEditing] = useState<string | null>(null);
  if (season.isLoading) return <Loading />;
  if (!season.data) return <ErrorState error={season.error} />;
  const data = season.data;
  const disputed = data.matches.filter((m) => m.status === 'DISPUTED');
  const editingMatch = editing ? data.matches.find((m) => m.id === editing) : undefined;

  return (
    <div className="admin">
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 14px' }}>
          <Logo size={34} inverted />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="title" style={{ fontSize: 17, fontStretch: '72%', lineHeight: 1 }}>
              ATP Umbria
            </span>
            <span className="mono" style={{ fontSize: 10.5, color: '#C6EEDB' }}>
              /admin, {data.season.label}
            </span>
          </div>
        </div>
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                height: 40,
                padding: '0 12px',
                border: 0,
                borderRadius: 11,
                fontWeight: 700,
                fontSize: 14,
                background: tab === t.key ? '#C6EEDB' : 'transparent',
                color: tab === t.key ? '#0B1A24' : '#fff',
              }}
            >
              {t.label}
              {t.key === 'dash' && disputed.length > 0 && (
                <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: '#F49A90', color: '#0B1A24', fontSize: 11, display: 'grid', placeItems: 'center' }}>{disputed.length}</span>
              )}
            </button>
          ))}
        </div>
        <Link to="/" style={{ height: 40, padding: '0 12px', border: '1px solid rgba(255,255,255,.18)', borderRadius: 11, color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', textDecoration: 'none', marginTop: 8 }}>
          Torna all'app
        </Link>
      </nav>

      <main className="admin-main">
        {tab === 'dash' && <Dashboard data={data} onEdit={setEditing} />}
        {tab === 'results' && <Results data={data} onEdit={setEditing} />}
        {tab === 'players' && <AdminPlayers />}
      </main>
      {editingMatch && <AdminResultEditor key={editingMatch.id} match={editingMatch} players={playerIndex(data.players)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
        {title}
      </h1>
      <span className="muted" style={{ fontSize: 13.5 }}>
        {sub}
      </span>
    </div>
  );
}

function useResultActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const force = useMutation({
    mutationFn: (id: string) => api(`/api/admin/matches/${id}/result/force-confirm`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Risultato confermato');
    },
    onError: (e) => toast(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/matches/${id}/result`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Risultato eliminato');
    },
    onError: (e) => toast(e.message),
  });
  return { force, remove };
}

function Dashboard({ data, onEdit }: { data: SeasonOverview; onEdit: (id: string) => void }) {
  const players = playerIndex(data.players);
  const { force } = useResultActions();
  const rr = data.matches.filter((m) => m.phase === 'ROUND_ROBIN');
  const disputed = rr.filter((m) => m.status === 'DISPUTED');
  const late = rr.filter((m) => m.status === 'TO_RECOVER' || m.status === 'POSTPONED');
  const clubName = (id: string | null) => data.clubs.find((c) => c.id === id)?.name;
  const tiles = [
    { v: rr.filter((m) => m.result && m.status !== 'DISPUTED').length, l: `partite giocate su ${rr.length}`, fg: 'var(--ink)' },
    { v: data.provisionalCount, l: 'risultati provvisori', fg: 'var(--accent)' },
    { v: disputed.length, l: 'contestazioni aperte', fg: 'var(--errFg)' },
    { v: late.length, l: 'da recuperare o rinviate', fg: 'var(--recFg)' },
  ];
  const name = (m: Match) => `${players.get(m.playerAId)!.shortName} vs ${players.get(m.playerBId)!.shortName}`;

  return (
    <>
      <Header title="Dashboard" sub={`${data.season.name} ${data.season.label}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
        {tiles.map((t) => (
          <div key={t.l} className="card" style={{ borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="display" style={{ fontSize: 36, lineHeight: 1, color: t.fg }}>
              {t.v}
            </span>
            <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {t.l}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 16, alignItems: 'start' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="title" style={{ fontSize: 20 }}>
            Contestazioni aperte
          </h2>
          {disputed.length === 0 && (
            <div className="muted" style={{ padding: 18, borderRadius: 18, border: '1.5px dashed var(--line2)', fontSize: 13.5 }}>
              Nessuna contestazione aperta.
            </div>
          )}
          {disputed.map((m) => (
            <div key={m.id} className="card" style={{ border: '1.5px solid var(--errFg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{name(m)}</span>
                <span className="faint" style={{ fontSize: 12 }}>
                  Giornata {m.round}
                </span>
              </div>
              <div style={{ fontWeight: 900, fontStretch: '70%', fontSize: 26 }}>{formatScore(m.result!)}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                Inserito da {m.result!.submittedByPlayerId ? players.get(m.result!.submittedByPlayerId)?.shortName : 'admin'} {formatDayWithWeekday(romeDay(m.result!.submittedAt))}
              </div>
              <div className="note note-err">"{m.result!.disputeNote}"</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ flex: '1 1 120px', height: 42, fontSize: 13.5 }} onClick={() => onEdit(m.id)}>
                  Modifica risultato
                </button>
                <button className="btn btn-primary" style={{ flex: '1 1 120px', height: 42, fontSize: 13.5 }} onClick={() => force.mutate(m.id)}>
                  Conferma così
                </button>
              </div>
            </div>
          ))}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="title" style={{ fontSize: 20 }}>
            Da recuperare e rinviate
          </h2>
          <div className="card">
            {late.length === 0 && (
              <div className="muted" style={{ padding: 18, fontSize: 13.5 }}>
                Nessuna partita in ritardo.
              </div>
            )}
            {late.map((m) => (
              <Link key={m.id} to={`/partite/${m.id}`} className="list-row">
                <div className="row-main">
                  <span className="row-title" style={{ fontSize: 14.5 }}>
                    {name(m)}
                  </span>
                  <span className="row-sub">
                    Giornata {m.round}, {matchInfo(m, data.rounds, clubName)}
                  </span>
                </div>
                <StatusPill status={m.status} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Results({ data, onEdit }: { data: SeasonOverview; onEdit: (id: string) => void }) {
  const players = playerIndex(data.players);
  const { force, remove } = useResultActions();
  const withoutResult = data.matches.filter((m) => !m.result);
  const withResult = data.matches.filter((m) => m.result).sort((a, b) => (b.result!.submittedAt > a.result!.submittedAt ? 1 : -1));
  return (
    <>
      <Header title="Risultati" sub="Inserisci, modifica, conferma o elimina qualsiasi risultato. Ogni azione resta nel registro." />
      <label className="field" style={{ maxWidth: 420 }}>
        <span>Inserisci il risultato di una partita</span>
        <select className="input" style={{ height: 46, fontSize: 14.5 }} value="" onChange={(e) => e.target.value && onEdit(e.target.value)}>
          <option value="">Scegli la partita…</option>
          {withoutResult.map((m) => (
            <option key={m.id} value={m.id}>
              G{m.round}: {players.get(m.playerAId)!.shortName} vs {players.get(m.playerBId)!.shortName}
            </option>
          ))}
        </select>
      </label>
      <div className="card">
        {withResult.map((m) => {
          const r = m.result!;
          const a = players.get(m.playerAId)!;
          const b = players.get(m.playerBId)!;
          return (
            <div key={m.id} className="list-row" style={{ flexWrap: 'wrap', padding: '11px 14px' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {a.shortName} vs {b.shortName}{' '}
                  <span className="faint" style={{ fontWeight: 500, fontSize: 12 }}>
                    G{m.round}
                  </span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatScore(r)}
                  {r.timeExpired ? ' (tempo scaduto)' : ''}{' '}
                  <span className="muted" style={{ fontWeight: 500 }}>
                    , {a.shortName} {r.pointsA}, {b.shortName} {r.pointsB}
                  </span>
                </span>
              </div>
              <StatusPill status={m.status} />
              <button className="btn btn-outline btn-sm" onClick={() => onEdit(m.id)}>
                Modifica
              </button>
              {r.status !== 'CONFIRMED' && (
                <button className="btn btn-primary btn-sm" onClick={() => force.mutate(m.id)}>
                  Forza conferma
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--errFg)' }}
                onClick={() => {
                  if (window.confirm(`Eliminare il risultato di ${a.shortName} vs ${b.shortName}?`)) remove.mutate(m.id);
                }}
              >
                Elimina
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
