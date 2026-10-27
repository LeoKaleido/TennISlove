import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { formatDayWithWeekday, formatScore, romeDay } from '@tentennis/shared';
import { api, type Match, type SeasonOverview } from '../api';
import { AdminResultEditor } from '../components/AdminResultEditor';
import { IconAction } from '../components/AdminTable';
import { AdminClubs } from './AdminClubs';
import { AdminPhotos } from './AdminPhotos';
import { AdminPlayers } from './AdminPlayers';
import { AdminSeasons, type SeasonRow } from './AdminSeasons';
import { AdminHeader as Header } from '../components/AdminHeader';
import { ErrorState, Loading, Logo, StatusPill, TabBarFoot, useToast } from '../components/ui';
import { matchInfo, playerIndex, useSeasonData } from '../data';

type Tab = 'dash' | 'seasons' | 'players' | 'clubs' | 'results' | 'photos';

/** Le schede che guardano un torneo preciso; le altre (tornei, giocatori, circoli) valgono per tutti */
const SEASON_TABS: Tab[] = ['dash', 'results', 'photos'];

// Torneo scelto nel gestionale: separato da quello dell'app, ricordato sul dispositivo
const ADMIN_SEASON_KEY = 'tennislove:admin-season';

function readAdminSeason() {
  try {
    return localStorage.getItem(ADMIN_SEASON_KEY);
  } catch {
    return null;
  }
}

/** Torneo del gestionale: quello scelto se esiste ancora, altrimenti quello in corso, altrimenti il più recente */
function useAdminSeason() {
  const seasons = useQuery({ queryKey: ['admin-seasons'], queryFn: () => api<SeasonRow[]>('/api/admin/seasons') });
  const [chosen, setChosen] = useState(readAdminSeason);
  const list = seasons.data ?? [];
  const id = list.find((s) => s.id === chosen)?.id ?? list.find((s) => s.status === 'ACTIVE')?.id ?? list[0]?.id;
  const choose = (next: string) => {
    setChosen(next);
    try {
      localStorage.setItem(ADMIN_SEASON_KEY, next);
    } catch {
      // storage non disponibile: la scelta vale finché la pagina resta aperta
    }
  };
  return { seasons, list, id, choose };
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'dash', label: 'Dashboard' },
  { key: 'seasons', label: 'Tornei' },
  { key: 'players', label: 'Giocatori' },
  { key: 'clubs', label: 'Circoli' },
  { key: 'results', label: 'Risultati' },
  { key: 'photos', label: 'Foto' },
];

export function AdminPage() {
  const admin = useAdminSeason();
  // senza tornei non c'è niente da chiedere: si parte dalla scheda Tornei
  const season = useSeasonData(admin.id);
  const [tab, setTab] = useState<Tab>('dash');
  const [editing, setEditing] = useState<string | null>(null);
  const data = admin.id ? season.data : undefined;
  const disputed = data?.matches.filter((m) => m.status === 'DISPUTED') ?? [];
  const editingMatch = editing ? data?.matches.find((m) => m.id === editing) : undefined;
  const picker = <AdminSeasonPicker list={admin.list} value={admin.id} onChange={admin.choose} />;

  const seasonTab = () => {
    if (admin.seasons.isLoading || (admin.id && season.isLoading)) return <Loading />;
    if (admin.seasons.error) return <ErrorState error={admin.seasons.error} />;
    if (!admin.id) {
      return (
        <div className="muted" style={{ padding: 18, borderRadius: 18, border: '1.5px dashed var(--line2)', fontSize: 13.5 }}>
          Nessun torneo ancora: crealo dalla scheda Tornei.
        </div>
      );
    }
    if (!data) return <ErrorState error={season.error} />;
    if (tab === 'dash') return <Dashboard data={data} picker={picker} onEdit={setEditing} />;
    if (tab === 'results') return <Results data={data} picker={picker} onEdit={setEditing} />;
    return <AdminPhotos data={data} picker={picker} />;
  };

  return (
    <div className="admin">
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 14px' }}>
          <Logo size={34} inverted />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="title brand" style={{ fontSize: 17, fontStretch: '72%', lineHeight: 1 }}>
              TennIsLove
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
        <TabBarFoot guide={false} />
      </nav>

      <main className="admin-main">
        {SEASON_TABS.includes(tab) && seasonTab()}
        {tab === 'players' && <AdminPlayers />}
        {tab === 'seasons' && <AdminSeasons />}
        {tab === 'clubs' && <AdminClubs />}
      </main>
      {data && editingMatch && <AdminResultEditor key={editingMatch.id} match={editingMatch} players={playerIndex(data.players)} onClose={() => setEditing(null)} />}
    </div>
  );
}

const SEASON_STATUS: Record<SeasonRow['status'], string> = { ACTIVE: 'in corso', ARCHIVED: 'concluso', DRAFT: 'in programma' };

/** Scelta del torneo nelle schede che ne guardano uno (dashboard, risultati, foto) */
function AdminSeasonPicker({ list, value, onChange }: { list: SeasonRow[]; value: string | undefined; onChange: (id: string) => void }) {
  if (!value) return null;
  const sameName = list.every((s) => s.name === list[0]!.name);
  return (
    <select className="season-picker admin-season" aria-label="Torneo" value={value} onChange={(e) => onChange(e.target.value)} disabled={list.length < 2}>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {sameName ? `Torneo ${s.label}` : `${s.name} ${s.label}`}, {SEASON_STATUS[s.status]}
        </option>
      ))}
    </select>
  );
}

/** Avviso nelle schede di un torneo che non è quello in corso */
function SeasonNote({ data }: { data: SeasonOverview }) {
  const { status, label } = data.season;
  if (status === 'ACTIVE') return null;
  return (
    <div className="note note-info">
      {status === 'ARCHIVED'
        ? `Torneo ${label} concluso: i giocatori non possono più inserire risultati. Le correzioni da qui cambiano la classifica, non il campione già proclamato.`
        : `Torneo ${label} in programma: i giocatori lo vedranno quando lo avvii dalla scheda Tornei.`}
    </div>
  );
}

function useForceConfirm() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => api(`/api/admin/matches/${id}/result/force-confirm`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Risultato confermato');
    },
    onError: (e) => toast(e.message),
  });
}

function Dashboard({ data, picker, onEdit }: { data: SeasonOverview; picker: ReactNode; onEdit: (id: string) => void }) {
  const players = playerIndex(data.players);
  const force = useForceConfirm();
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
      <Header title="Dashboard" aside={picker} />
      <SeasonNote data={data} />
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
              // niente link alla scheda dell'app (D-036): si apre l'inserimento del risultato del gestionale
              <button key={m.id} className="list-row" onClick={() => onEdit(m.id)}>
                <div className="row-main">
                  <span className="row-title" style={{ fontSize: 14.5 }}>
                    {name(m)}
                  </span>
                  <span className="row-sub">
                    Giornata {m.round}, {matchInfo(m, data.rounds, clubName)}
                  </span>
                </div>
                <StatusPill status={m.status} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Results({ data, picker, onEdit }: { data: SeasonOverview; picker: ReactNode; onEdit: (id: string) => void }) {
  const players = playerIndex(data.players);
  const [view, setView] = useState<'done' | 'todo'>('done');
  const withoutResult = data.matches.filter((m) => !m.result);
  const withResult = data.matches.filter((m) => m.result).sort((a, b) => (b.result!.submittedAt > a.result!.submittedAt ? 1 : -1));
  const rows = view === 'done' ? withResult : withoutResult;
  return (
    <>
      <Header title="Risultati" aside={picker} />
      <SeasonNote data={data} />
      <div className="segmented" style={{ maxWidth: 420 }}>
        <button aria-pressed={view === 'done'} onClick={() => setView('done')}>
          Con risultato ({withResult.length})
        </button>
        <button aria-pressed={view === 'todo'} onClick={() => setView('todo')}>
          Da inserire ({withoutResult.length})
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="muted" style={{ padding: 18, borderRadius: 18, border: '1.5px dashed var(--line2)', fontSize: 13.5 }}>
          {view === 'done' ? 'Nessun risultato ancora.' : 'Tutte le partite hanno un risultato.'}
        </div>
      ) : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Giornata</th>
                <th>Partita</th>
                <th>Risultato</th>
                <th>Punti</th>
                <th>Stato</th>
                <th className="actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const r = m.result;
                const a = players.get(m.playerAId)!;
                const b = players.get(m.playerBId)!;
                if (!r) {
                  return (
                    <tr key={m.id}>
                      <td className="muted" style={{ fontSize: 12.5 }}>
                        G{m.round}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {a.shortName} vs {b.shortName}
                      </td>
                      <td className="faint">-</td>
                      <td className="faint">-</td>
                      <td>
                        <StatusPill status={m.status} />
                      </td>
                      <td className="actions">
                        <span className="icon-actions">
                          <IconAction icon="add" tip="Inserisci risultato" onClick={() => onEdit(m.id)} />
                        </span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={m.id}>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      G{m.round}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {a.shortName} vs {b.shortName}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatScore(r)}
                      {r.timeExpired && (
                        <span className="muted" style={{ fontWeight: 500, fontSize: 12.5 }}>
                          {' '}
                          (tempo scaduto)
                        </span>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      {a.shortName} {r.pointsA}, {b.shortName} {r.pointsB}
                    </td>
                    <td>
                      <StatusPill status={m.status} />
                    </td>
                    <td className="actions">
                      <span className="icon-actions">
                        <IconAction icon="edit" tip="Modifica risultato" onClick={() => onEdit(m.id)} />
                        {/* lo spazio resta anche senza l'azione: le icone restano in colonna */}
                        {r.status !== 'CONFIRMED' ? (
                          <IconAction icon="confirm" tip="Forza conferma" confirm url={`/api/admin/matches/${m.id}/result/force-confirm`} method="POST" done="Risultato confermato" />
                        ) : (
                          <span className="icon-action" aria-hidden />
                        )}
                        <IconAction icon="delete" tip="Elimina risultato" danger confirm url={`/api/admin/matches/${m.id}/result`} method="DELETE" done="Risultato eliminato" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
