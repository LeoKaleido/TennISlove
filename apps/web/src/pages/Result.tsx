import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type MatchDetail } from '../api';
import { PointsPreview } from '../components/PointsPreview';
import { BackButton, ErrorState, Loading, useToast } from '../components/ui';
import { playerIndex, useMe, useSeason } from '../data';
import { evaluateForm, formFromResult, type Pair, type ScoreForm } from '../score-form';

/** Inserimento risultato dal telefono, solo per i due giocatori. L'admin corregge dal gestionale. */
export function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useMe();
  const season = useSeason();
  const detail = useQuery({ queryKey: ['match', id], queryFn: () => api<MatchDetail>(`/api/matches/${id}`) });

  if (detail.isLoading || season.isLoading) return <Loading />;
  if (!detail.data || !season.data) return <ErrorState error={detail.error ?? season.error} />;
  return (
    <ResultForm
      key={id}
      detail={detail.data}
      players={playerIndex(season.data.players)}
      myId={me.data?.playerId ?? null}
      autoConfirmDays={season.data.season.resultAutoConfirmDays}
      onDone={() => navigate(`/partite/${id}`, { replace: true })}
    />
  );
}

function ResultForm({
  detail,
  players,
  myId,
  autoConfirmDays,
  onDone,
}: {
  detail: MatchDetail;
  players: ReturnType<typeof playerIndex>;
  myId: string | null;
  autoConfirmDays: number;
  onDone: () => void;
}) {
  const m = detail.match;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<ScoreForm>(formFromResult(m.result));

  const a = players.get(m.playerAId)!;
  const b = players.get(m.playerBId)!;
  const nameOf = (id: string, fallback: string) => (id === myId ? 'Tu' : fallback);
  const names: [string, string] = [nameOf(a.id, a.shortName), nameOf(b.id, b.shortName)];
  const opponentName = myId === a.id ? b.shortName : a.shortName;
  const { input, ev, split, feedback: message } = evaluateForm(form, names);

  const submit = useMutation({
    mutationFn: () => api(`/api/matches/${m.id}/result`, { method: 'PUT', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(`Risultato inviato: ${opponentName} deve confermarlo`);
      onDone();
    },
    onError: (e) => toast(e.message),
  });

  const ok = ev.status === 'OK';
  const field = (key: 'set1' | 'set2' | 'stb') => (p: Pair) => setForm({ ...form, [key]: p });
  const sets: { label: string; hint: string; value: Pair; set: (p: Pair) => void; max: number }[] = [
    { label: '1° set', hint: 'game 0-7', value: form.set1, set: field('set1'), max: 7 },
    { label: '2° set', hint: 'game 0-7', value: form.set2, set: field('set2'), max: 7 },
  ];
  if (split) sets.push({ label: 'Super tie break', hint: 'punti, a 10', value: form.stb, set: field('stb'), max: 30 });
  const timeExpired = form.timeExpired;

  return (
    <div className="screen" style={{ gap: 0, paddingBottom: 0 }}>
      <div className="sticky-header">
        <BackButton />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span className="title" style={{ fontSize: 21 }}>
            Inserisci risultato
          </span>
          <span className="muted ellipsis" style={{ fontSize: 12.5 }}>
            {a.shortName} vs {b.shortName}, giornata {m.round}
          </span>
        </div>
      </div>

      <div style={{ padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sets.map((st) => (
          <div key={st.label} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="title" style={{ fontSize: 18 }}>
                {st.label}
              </span>
              <span className="faint" style={{ fontSize: 12 }}>
                {st.hint}
              </span>
            </div>
            {[0, 1].map((side) => (
              <Stepper
                key={side}
                name={names[side]!}
                value={st.value[side]!}
                max={st.max}
                onChange={(v) => {
                  const next: Pair = [...st.value];
                  next[side] = v;
                  st.set(next);
                }}
              />
            ))}
          </div>
        ))}

        <button
          onClick={() => setForm({ ...form, timeExpired: !timeExpired })}
          aria-pressed={timeExpired}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, border: `1.5px solid ${timeExpired ? 'var(--accent)' : 'var(--line2)'}`, background: 'var(--surface)', textAlign: 'left' }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              fontWeight: 900,
              color: 'var(--onAccent)',
              background: timeExpired ? 'var(--accent)' : 'transparent',
              border: timeExpired ? 'none' : '2px solid var(--line2)',
            }}
          >
            {timeExpired ? '✓' : ''}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Tempo scaduto</span>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
              Le 2 ore sono finite senza un vincitore: ognuno prende solo i game vinti
            </span>
          </span>
        </button>

        <div className={`note note-${message.tone}`}>{message.text}</div>
        <div className="faint" style={{ fontSize: 12, lineHeight: 1.45, padding: '0 4px' }}>
          Dopo l'invio {opponentName} riceve il risultato da confermare. Se non risponde, si conferma automaticamente tra {autoConfirmDays} giorni.
        </div>
      </div>

      <div className="sticky-footer">
        <span className="faint" style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Anteprima punti
        </span>
        <PointsPreview ev={ev} names={names} />
        <button className="btn btn-primary" disabled={!ok || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? 'Invio…' : 'Invia risultato'}
        </button>
      </div>
    </div>
  );
}

function Stepper({ name, value, max, onChange }: { name: string; value: number; max: number; onChange: (v: number) => void }) {
  const btn = { width: 52, height: 52, borderRadius: 16, fontSize: 26, fontWeight: 500 } as const;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="ellipsis" style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15 }}>
        {name}
      </span>
      <button aria-label={`Togli un game a ${name}`} disabled={value <= 0} onClick={() => onChange(value - 1)} style={{ ...btn, border: '1.5px solid var(--line2)', background: 'var(--bg)', opacity: value <= 0 ? 0.35 : 1 }}>
        −
      </button>
      <span style={{ width: 44, textAlign: 'center', fontWeight: 900, fontStretch: '70%', fontSize: 38, lineHeight: 1 }}>{value}</span>
      <button aria-label={`Aggiungi un game a ${name}`} disabled={value >= max} onClick={() => onChange(value + 1)} style={{ ...btn, border: 0, background: 'var(--accent)', color: 'var(--onAccent)', opacity: value >= max ? 0.35 : 1 }}>
        +
      </button>
    </div>
  );
}
