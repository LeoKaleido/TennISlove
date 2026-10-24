// Gestionale: elenco tornei e procedura "Nuovo torneo" in 4 passi (D-028).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { formatDay, formatRange, roundRobin, scheduleWeeks, type Pause } from '@tentennis/shared';
import { api } from '../api';
import { ErrorState, Loading, useToast } from '../components/ui';

interface SeasonRow {
  id: string;
  name: string;
  label: string;
  subtitle: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  qualifiers: number;
  players: number;
  matches: number;
  played: number;
  rounds: number;
  startsOn: string | null;
  endsOn: string | null;
  champion: string | null;
}

interface PersonRow {
  player: { id: string; firstName: string; lastName: string; shortName: string } | null;
  email: string | null;
}

interface ClubRow {
  id: string;
  name: string;
  city: string | null;
  active: boolean;
}

export function AdminSeasons() {
  const seasons = useQuery({ queryKey: ['admin-seasons'], queryFn: () => api<SeasonRow[]>('/api/admin/seasons') });
  const queryClient = useQueryClient();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const activate = useMutation({
    mutationFn: (id: string) => api(`/api/admin/seasons/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Torneo avviato: ora è quello che vedono i giocatori');
    },
    onError: (e) => toast(e.message),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/admin/seasons/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Torneo chiuso e archiviato');
    },
    onError: (e) => toast(e.message),
  });

  if (creating) return <SeasonWizard existing={seasons.data ?? []} onDone={() => setCreating(false)} />;
  if (seasons.isLoading) return <Loading />;
  if (!seasons.data) return <ErrorState error={seasons.error} />;

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
            Tornei
          </h1>
          <span className="muted" style={{ fontSize: 13.5 }}>
            Il torneo in corso è quello che vedono i giocatori. I tornei chiusi restano consultabili dalla Classifica.
          </span>
        </div>
        <button className="btn btn-primary" style={{ height: 44, fontSize: 14 }} onClick={() => setCreating(true)}>
          + Nuovo torneo
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
        {seasons.data.map((s) => {
          const live = s.status === 'ACTIVE';
          const running = seasons.data.find((x) => x.status === 'ACTIVE');
          return (
            <div
              key={s.id}
              className="card"
              style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: live ? 'var(--hero)' : undefined, color: live ? '#fff' : undefined }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pill" style={{ background: live ? '#C6EEDB' : 'var(--surface2)', color: live ? '#0B1A24' : 'var(--ink2)' }}>
                  {live ? 'In corso' : s.status === 'ARCHIVED' ? 'Concluso' : 'In programma'}
                </span>
                <span className="mono" style={{ fontSize: 12, opacity: 0.75 }}>
                  {s.label}
                </span>
              </div>
              <span className="display" style={{ fontSize: 26, lineHeight: 0.95 }}>
                {s.name}
              </span>
              <span style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.4 }}>
                {s.players} giocatori, {s.rounds} giornate, {s.played} partite giocate su {s.matches}
                {s.startsOn && s.endsOn ? `, ${formatRange(s.startsOn, s.endsOn)}` : ''}
                {s.qualifiers ? `, poi fase finale con i primi ${s.qualifiers}` : ''}
              </span>
              {s.champion && (
                <span style={{ fontSize: 13.5 }}>
                  Campione: <strong>{s.champion}</strong>
                </span>
              )}
              {live && (
                <button
                  className="btn"
                  style={{ height: 40, fontSize: 13, background: '#C6EEDB', color: '#0B1A24', marginTop: 4 }}
                  disabled={archive.isPending}
                  onClick={() => {
                    if (window.confirm(`Chiudere e archiviare ${s.name} ${s.label}? I giocatori non potranno più inserire risultati.`)) archive.mutate(s.id);
                  }}
                >
                  Chiudi e archivia
                </button>
              )}
              {s.status === 'DRAFT' && (
                <>
                  <button className="btn btn-primary" style={{ height: 40, fontSize: 13, marginTop: 4 }} disabled={!!running || activate.isPending} onClick={() => activate.mutate(s.id)}>
                    Avvia torneo
                  </button>
                  {running && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      Si avvia dopo aver chiuso {running.label}.
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const STEPS = ['Torneo', 'Giocatori e circoli', 'Date e pause', 'Calendario'];

const nextLabel = (labels: string[]) => {
  const years = labels.map((l) => Number(l.slice(0, 4))).filter(Number.isFinite);
  const y = years.length ? Math.max(...years) + 1 : new Date().getFullYear();
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
};

function SeasonWizard({ existing, onDone }: { existing: SeasonRow[]; onDone: () => void }) {
  const people = useQuery({ queryKey: ['admin-people'], queryFn: () => api<{ people: PersonRow[] }>('/api/admin/people') });
  const clubs = useQuery({ queryKey: ['admin-clubs'], queryFn: () => api<ClubRow[]>('/api/admin/clubs') });
  const queryClient = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(existing[0]?.name ?? 'ATP Umbria Tournament');
  const [label, setLabel] = useState(nextLabel(existing.map((s) => s.label)));
  const [subtitle, setSubtitle] = useState(existing[0]?.subtitle ?? '');
  const [qualifiers, setQualifiers] = useState(8);
  const [playerIds, setPlayerIds] = useState<string[] | null>(null);
  const [clubIds, setClubIds] = useState<string[] | null>(null);
  const [start, setStart] = useState('');
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [pauseDraft, setPauseDraft] = useState<Pause>({ from: '', to: '' });
  const [seed, setSeed] = useState(1);

  const allPlayers = (people.data?.people ?? []).filter((p) => p.player).map((p) => p.player!).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const allClubs = (clubs.data ?? []).filter((c) => c.active);
  const selPlayers = playerIds ?? allPlayers.map((p) => p.id);
  const selClubs = clubIds ?? allClubs.map((c) => c.id);
  const byId = new Map(allPlayers.map((p) => [p.id, p]));

  const generated = useMemo(() => roundRobin(selPlayers, seed), [selPlayers.join(','), seed]);
  const weeks = useMemo(() => (start ? scheduleWeeks(start, generated.length, pauses) : []), [start, generated.length, pauses]);

  const isMonday = start && new Date(`${start}T12:00:00Z`).getUTCDay() === 1;
  const error =
    step === 1 && (!name.trim() || !label.trim())
      ? 'Inserisci nome e stagione'
      : step === 2 && selPlayers.length < 2
        ? 'Servono almeno 2 giocatori'
        : step === 2 && selClubs.length === 0
          ? 'Scegli almeno un circolo'
          : step === 3 && !isMonday
            ? 'La prima giornata deve iniziare di lunedì'
            : '';

  const running = existing.find((s) => s.status === 'ACTIVE');
  const create = useMutation({
    mutationFn: () =>
      api('/api/admin/seasons', {
        method: 'POST',
        body: {
          name,
          label,
          subtitle,
          qualifiers,
          playerIds: selPlayers,
          clubIds: selClubs,
          rounds: generated.map((r, i) => ({ startsOn: weeks[i]!.startsOn, endsOn: weeks[i]!.endsOn, pauseAfter: weeks[i]!.pauseAfter, pairs: r.pairs })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(running ? `${name} ${label} creato e in programma` : `${name} ${label} creato: ora è il torneo in corso`);
      onDone();
    },
    onError: (e) => toast(e.message),
  });

  if (people.isLoading || clubs.isLoading) return <Loading />;
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const shortOf = (id: string) => byId.get(id)?.shortName ?? '?';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
          Nuovo torneo
        </h1>
        <span className="muted" style={{ fontSize: 13.5 }}>
          Girone all'italiana di sola andata, regolamento come il 2026/27.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {STEPS.map((l, i) => (
          <button key={l} onClick={() => i + 1 < step && setStep(i + 1)} style={{ border: 0, background: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', cursor: i + 1 < step ? 'pointer' : 'default' }}>
            <span style={{ height: 5, borderRadius: 3, background: i + 1 <= step ? 'var(--accent)' : 'var(--line2)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: i + 1 === step ? 'var(--ink)' : 'var(--ink3)' }}>
              {i + 1}. {l}
            </span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
          <label className="field">
            <span>Nome del torneo</span>
            <input className="input" style={{ height: 48 }} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label className="field">
              <span>Stagione</span>
              <input className="input" style={{ height: 48 }} value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="field">
              <span>Sottotitolo</span>
              <input className="input" style={{ height: 48 }} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </label>
          </div>
          <div className="field">
            <span>Accedono alla fase finale</span>
            <div className="segmented" style={{ maxWidth: 360 }}>
              {[4, 8, 0].map((q) => (
                <button key={q} aria-pressed={qualifiers === q} onClick={() => setQualifiers(q)}>
                  {q ? `Primi ${q}` : 'Nessuna'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16, alignItems: 'start' }}>
          <div className="card">
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="title" style={{ fontSize: 18 }}>
                Giocatori
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
                {selPlayers.length} scelti, {(selPlayers.length * (selPlayers.length - 1)) / 2} partite
              </span>
            </div>
            {allPlayers.map((p) => {
              const on = selPlayers.includes(p.id);
              return (
                <button key={p.id} className="list-row" style={{ padding: '9px 16px', borderTop: '1px solid var(--line)' }} onClick={() => setPlayerIds(toggle(selPlayers, p.id))}>
                  <Check on={on} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5, color: on ? 'var(--ink)' : 'var(--ink3)' }}>
                    {p.firstName} {p.lastName}
                  </span>
                </button>
              );
            })}
            <div className="muted" style={{ padding: '10px 16px', fontSize: 12.5, borderTop: '1px solid var(--line)' }}>
              Manca qualcuno? Aggiungilo prima dalla sezione Giocatori.
            </div>
          </div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="title" style={{ fontSize: 18 }}>
              Circoli
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allClubs.map((c) => (
                <button key={c.id} className="chip" aria-pressed={selClubs.includes(c.id)} onClick={() => setClubIds(toggle(selClubs, c.id))}>
                  {c.name}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              Sono i circoli che i giocatori vedranno quando programmano una partita.
            </span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          <label className="field" style={{ maxWidth: 260 }}>
            <span>Lunedì della prima giornata</span>
            <input className="input" style={{ height: 48 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <div className="field">
            <span>Pause (nessuna giornata in questi giorni)</span>
            {pauses.map((p, i) => (
              <div key={i} className="note note-warn" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1 }}>
                  Dal {formatDay(p.from)} al {formatDay(p.to)}
                </span>
                <button className="link-btn" style={{ color: 'inherit' }} onClick={() => setPauses(pauses.filter((_, j) => j !== i))}>
                  Rimuovi
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input" style={{ height: 42, width: 170, fontSize: 14 }} type="date" value={pauseDraft.from} onChange={(e) => setPauseDraft({ ...pauseDraft, from: e.target.value })} />
              <span className="faint">-</span>
              <input className="input" style={{ height: 42, width: 170, fontSize: 14 }} type="date" value={pauseDraft.to} min={pauseDraft.from} onChange={(e) => setPauseDraft({ ...pauseDraft, to: e.target.value })} />
              <button
                className="btn btn-outline"
                style={{ height: 42 }}
                disabled={!pauseDraft.from || !pauseDraft.to || pauseDraft.to < pauseDraft.from}
                onClick={() => {
                  setPauses([...pauses, pauseDraft]);
                  setPauseDraft({ from: '', to: '' });
                }}
              >
                + Aggiungi pausa
              </button>
            </div>
          </div>
          {weeks.length > 0 && isMonday && (
            <div className="note note-ok">
              {weeks.length} giornate, dal {formatDay(weeks[0]!.startsOn)} al {formatDay(weeks[weeks.length - 1]!.endsOn)}
              {pauses.length ? `, con ${pauses.length === 1 ? '1 pausa' : `${pauses.length} pause`}` : ''}.
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 13.5, lineHeight: 1.45, maxWidth: 560 }}>
              Calendario generato in automatico: ognuno gioca una volta a settimana e incontra tutti una volta. Giorno, ora e circolo li sceglieranno i giocatori.
            </span>
            <button className="btn btn-outline" onClick={() => setSeed(seed + 1)}>
              Rimescola accoppiamenti
            </button>
          </div>
          {running && (
            <div className="note note-info">
              {running.name} {running.label} è ancora in corso: il nuovo torneo resterà in programma e lo avvii dopo aver chiuso quello attuale.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 10 }}>
            {generated.map((r, i) => (
              <div key={i} className="card" style={{ borderRadius: 18 }}>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: 'var(--surface2)' }}>
                  <span className="title" style={{ fontSize: 16 }}>
                    Giornata {i + 1}
                  </span>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>
                    {weeks[i] ? formatRange(weeks[i]!.startsOn, weeks[i]!.endsOn) : ''}
                  </span>
                </div>
                {r.pairs.map(([a, b]) => (
                  <div key={a + b} style={{ padding: '7px 14px', fontSize: 13.5, borderTop: '1px solid var(--line)' }}>
                    {shortOf(a)} vs {shortOf(b)}
                  </div>
                ))}
                {r.bye && (
                  <div className="faint" style={{ padding: '7px 14px', fontSize: 12.5, borderTop: '1px solid var(--line)' }}>
                    Riposa: {shortOf(r.bye)}
                  </div>
                )}
                {weeks[i]?.pauseAfter && (
                  <div className="note-warn" style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 700 }}>
                    Poi {weeks[i]!.pauseAfter.toLowerCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <button className="btn btn-outline" onClick={() => (step === 1 ? onDone() : setStep(step - 1))}>
          {step === 1 ? 'Annulla' : 'Indietro'}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--errFg)', fontWeight: 600 }}>{error}</span>
        <button
          className="btn btn-primary"
          style={{ height: 46, fontSize: 14 }}
          disabled={!!error || create.isPending}
          onClick={() => (step < 4 ? setStep(step + 1) : create.mutate())}
        >
          {step < 4 ? 'Avanti' : create.isPending ? 'Creazione…' : 'Crea e pubblica'}
        </button>
      </div>
    </>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 900,
        background: on ? 'var(--accent)' : 'transparent',
        color: 'var(--onAccent)',
        border: on ? 'none' : '2px solid var(--line2)',
      }}
    >
      {on ? '✓' : ''}
    </span>
  );
}
