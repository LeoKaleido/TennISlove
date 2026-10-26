// Pannello desktop del gestionale per inserire o correggere un risultato (sempre confermato).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, type Match, type Player } from '../api';
import { outcomeColors, sideOutcome } from './PointsPreview';
import { evaluateForm, formFromResult, type Pair, type ScoreForm } from '../score-form';
import { ButtonLoader, useClosing, useToast } from './ui';

const COLUMNS = [
  { key: 'set1', label: '1° set', max: 7 },
  { key: 'set2', label: '2° set', max: 7 },
  { key: 'stb', label: 'Super tie break', max: 30 },
] as const;

export function AdminResultEditor({ match, players, onClose }: { match: Match; players: Map<string, Player>; onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<ScoreForm>(formFromResult(match.result));
  const a = players.get(match.playerAId)!;
  const b = players.get(match.playerBId)!;
  const names: [string, string] = [a.shortName, b.shortName];
  const { input, ev, split, feedback } = evaluateForm(form, names);
  const r = match.result;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const save = useMutation({
    mutationFn: () => api(`/api/admin/matches/${match.id}/result`, { method: 'PUT', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Risultato salvato');
      close();
    },
    onError: (e) => toast(e.message),
  });

  const setCell = (key: 'set1' | 'set2' | 'stb', side: 0 | 1, raw: string, max: number) => {
    const n = Math.max(0, Math.min(max, Number.parseInt(raw, 10) || 0));
    const next: Pair = [...form[key]];
    next[side] = n;
    setForm({ ...form, [key]: next });
  };

  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Modifica risultato">
      <div className="modal-backdrop" onClick={close} />
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="kicker" style={{ color: 'var(--accent)' }}>
              Giornata {match.round}, {match.code}
            </span>
            <h2 className="display" style={{ fontSize: 32 }}>
              {a.shortName} vs {b.shortName}
            </h2>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>

        {r?.status === 'DISPUTED' && <div className="note note-err">Contestazione: "{r.disputeNote}"</div>}

        <table className="admin-score">
          <thead>
            <tr>
              <th />
              {COLUMNS.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th>Punti</th>
            </tr>
          </thead>
          <tbody>
            {([0, 1] as const).map((side) => (
              <tr key={side}>
                <th scope="row">{names[side]}</th>
                {COLUMNS.map((c) => {
                  const disabled = c.key === 'stb' && !split;
                  return (
                    <td key={c.key}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={c.max}
                        disabled={disabled}
                        aria-label={`${c.label} ${names[side]}`}
                        value={disabled ? '' : form[c.key][side]}
                        onChange={(e) => setCell(c.key, side, e.target.value, c.max)}
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                  );
                })}
                <td>
                  <span className="outcome-badge" style={outcomeColors(sideOutcome(ev, side === 0 ? 'A' : 'B'))}>
                    {ev.status === 'OK' ? (side === 0 ? ev.pointsA : ev.pointsB) : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14.5 }}>
          <input type="checkbox" checked={form.timeExpired} onChange={(e) => setForm({ ...form, timeExpired: e.target.checked })} style={{ width: 18, height: 18 }} />
          Tempo scaduto
          <span className="muted" style={{ fontWeight: 500, fontSize: 13 }}>
            (nessun vincitore, ognuno prende i game vinti)
          </span>
        </label>

        <div className={`note note-${feedback.tone}`}>{feedback.text}</div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={close}>
            Annulla
          </button>
          <button className="btn btn-primary" style={{ height: 46, fontSize: 14 }} disabled={ev.status !== 'OK' || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <ButtonLoader /> : 'Salva e conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}
