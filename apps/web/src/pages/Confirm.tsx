import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDayWithWeekday, romeDay } from '@tentennis/shared';
import { api, type MatchDetail } from '../api';
import { BackButton, ErrorState, HelpLink, Loading, ScoreTable } from '../components/ui';
import { playerIndex, useMe, useCurrentSeason } from '../data';
import { clearDraft, loadDraft, saveDraft } from '../drafts';

/** Vista dell'avversario: conferma o contesta il risultato (D-010) */
export function ConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const season = useCurrentSeason();
  const detail = useQuery({ queryKey: ['match', id], queryFn: () => api<MatchDetail>(`/api/matches/${id}`) });
  const queryClient = useQueryClient();
  const draftKey = `dispute:${id}`;
  const [note, setNote] = useState(() => loadDraft<string>(draftKey) ?? '');
  const [contesting, setContesting] = useState(note !== '');
  useEffect(() => (note ? saveDraft(draftKey, note) : clearDraft(draftKey)), [draftKey, note]);
  const [done, setDone] = useState<'confirmed' | 'disputed' | null>(null);

  const confirm = useMutation({
    mutationFn: () => api(`/api/matches/${id}/result/confirm`, { method: 'POST' }),
    onSuccess: () => {
      setDone('confirmed');
      setNote('');
      queryClient.invalidateQueries();
    },
  });
  const dispute = useMutation({
    mutationFn: () => api(`/api/matches/${id}/result/dispute`, { method: 'POST', body: { note } }),
    onSuccess: () => {
      setDone('disputed');
      setNote('');
      queryClient.invalidateQueries();
    },
  });

  if (detail.isLoading || season.isLoading) return <Loading />;
  if (!detail.data || !season.data) return <ErrorState error={detail.error ?? season.error} />;
  const m = detail.data.match;
  const r = m.result;
  const players = playerIndex(season.data.players);
  const by = r?.submittedByPlayerId ? players.get(r.submittedByPlayerId) : undefined;
  const myId = me.data?.playerId;
  const canAnswer = r?.status === 'PENDING' && !!myId && (m.playerAId === myId || m.playerBId === myId) && r.submittedByPlayerId !== myId;
  const error = confirm.error ?? dispute.error;

  return (
    <div className="screen">
      <div className="sticky-header">
        <BackButton to={`/partite/${m.id}`} />
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="kicker" style={{ color: 'var(--accent)' }}>
            Giornata {m.round}
          </span>
          <h1 className="display with-help" style={{ fontSize: 40, lineHeight: 0.92 }}>
            Confermi il risultato? <HelpLink to="conferma" label="confermare o contestare" />
          </h1>
          {r && (
            <span className="muted" style={{ fontSize: 14 }}>
              {by ? `${by.shortName} ha inserito il risultato` : 'Risultato inserito'} {formatDayWithWeekday(romeDay(r.submittedAt))}.
            </span>
          )}
        </div>

        {r && (
          <div className="card" style={{ padding: '6px 14px' }}>
            <ScoreTable match={m} players={players} />
          </div>
        )}

        {done ? (
          <>
            <div className={`note ${done === 'confirmed' ? 'note-ok' : 'note-err'}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <strong style={{ fontSize: 16 }}>{done === 'confirmed' ? 'Risultato confermato' : 'Contestazione inviata'}</strong>
            </div>
            <Link to={`/partite/${m.id}`} className="btn btn-outline">
              Vai alla partita
            </Link>
          </>
        ) : !canAnswer ? (
          <div className="note note-info">
            {r?.status === 'CONFIRMED'
              ? 'Il risultato è già confermato.'
              : r?.status === 'DISPUTED'
                ? 'Il risultato è contestato.'
                : "Può rispondere solo l'avversario di chi ha inserito il risultato."}
          </div>
        ) : !contesting ? (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 16, background: 'var(--surface2)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                <strong>Si conferma automaticamente {r?.autoConfirmAt ? formatDayWithWeekday(romeDay(r.autoConfirmAt)) : ''}</strong>
                <br />
                <span className="muted">Se il punteggio è giusto non serve fare nulla, ma confermando la classifica diventa definitiva subito.</span>
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => confirm.mutate()} disabled={confirm.isPending}>
              Conferma
            </button>
            <button className="btn btn-danger" style={{ height: 52 }} onClick={() => setContesting(true)}>
              Contesta
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span style={{ color: 'var(--ink)' }}>Cosa non torna?</span>
              <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. il secondo set è finito 6-3, non 6-4" />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, height: 52 }} onClick={() => setContesting(false)}>
                Annulla
              </button>
              <button className="btn" style={{ flex: 1.4, height: 52, background: 'var(--errFg)', color: 'var(--surface)' }} disabled={note.trim().length < 3 || dispute.isPending} onClick={() => dispute.mutate()}>
                Invia contestazione
              </button>
            </div>
          </>
        )}
        {error && <div className="note note-err">{error.message}</div>}
      </div>
    </div>
  );
}
