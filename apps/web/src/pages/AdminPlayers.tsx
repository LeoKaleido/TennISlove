// Gestionale: giocatori, amministratori e inviti (D-035, D-063).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { formatDayWithWeekday, romeDay } from '@tentennis/shared';
import { api } from '../api';
import { Avatar, ButtonLoader, ErrorState, Loading, TextField, useClosing, useToast } from '../components/ui';

interface Person {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  /** accesso revocato: resta in calendario e classifica ma non entra */
  disabledAt: string | null;
  invitedAt: string | null;
  lastLoginAt: string | null;
  player: { id: string; firstName: string; lastName: string; shortName: string; seasons: string[]; hasMatches: boolean } | null;
}

interface PlayerForm {
  firstName: string;
  lastName: string;
  shortName: string;
  email: string;
}

const EMPTY: PlayerForm = { firstName: '', lastName: '', shortName: '', email: '' };

const day = (iso: string) => formatDayWithWeekday(romeDay(iso));

export function AdminPlayers() {
  const people = useQuery({ queryKey: ['admin-people'], queryFn: () => api<{ people: Person[] }>('/api/admin/people') });
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Person | 'new' | null>(null);
  const [newAdmin, setNewAdmin] = useState(false);

  const invite = useMutation({
    mutationFn: (p: Person) => api(`/api/admin/users/${p.userId}/invite`, { method: 'POST' }),
    onSuccess: (_, p) => {
      queryClient.invalidateQueries({ queryKey: ['admin-people'] });
      toast(`Invito inviato a ${p.email}`);
    },
    onError: (e) => toast(e.message),
  });

  if (people.isLoading) return <Loading />;
  if (!people.data) return <ErrorState error={people.error} />;
  const players = people.data.people.filter((p) => p.player).sort((a, b) => a.player!.lastName.localeCompare(b.player!.lastName));
  const adminsOnly = people.data.people.filter((p) => !p.player);

  const status = (p: Person) => {
    if (p.disabledAt) return { text: 'Accesso revocato', color: 'var(--errFg)' };
    if (!p.email) return { text: 'Senza email', color: 'var(--errFg)' };
    if (p.lastLoginAt) return { text: `Entrato ${day(p.lastLoginAt)}`, color: 'var(--accent)' };
    if (p.invitedAt) return { text: `Invitato ${day(p.invitedAt)}`, color: 'var(--warnFg)' };
    return { text: 'Mai invitato', color: 'var(--ink3)' };
  };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
            Giocatori
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ height: 44, fontSize: 14 }} onClick={() => setNewAdmin(true)}>
            + Nuovo amministratore
          </button>
          <button className="btn btn-primary" style={{ height: 44, fontSize: 14 }} onClick={() => setEditing('new')}>
            + Nuovo giocatore
          </button>
        </div>
      </div>

      <div className="card">
        {players.map((p) => {
          const pl = p.player!;
          const st = status(p);
          return (
            <div key={pl.id} className="list-row" style={{ flexWrap: 'wrap', padding: '10px 14px' }}>
              <Avatar player={{ ...pl, photoUrl: null }} size={36} />
              <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {pl.firstName} {pl.lastName}{' '}
                  <span className="faint" style={{ fontWeight: 500, fontSize: 12 }}>
                    ({pl.shortName})
                  </span>
                </span>
                <span className="mono muted ellipsis" style={{ fontSize: 12 }}>
                  {p.email ?? 'nessuna email'}
                </span>
              </div>
              {p.isAdmin && (
                <span className="pill" style={{ background: 'var(--night)', color: '#C6EEDB' }}>
                  Admin
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, width: 140, color: st.color }}>{st.text}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>
                Modifica
              </button>
              {p.userId && (
                <button className="btn btn-outline btn-sm" disabled={invite.isPending} onClick={() => invite.mutate(p)}>
                  {p.disabledAt ? 'Riattiva e invita' : p.invitedAt || p.lastLoginAt ? 'Reinvia invito' : 'Invita'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {adminsOnly.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="title" style={{ fontSize: 20 }}>
            Solo amministratori
          </h2>
          <div className="card">
            {adminsOnly.map((p) => (
              <div key={p.userId} className="list-row" style={{ flexWrap: 'wrap', padding: '10px 14px' }}>
                <span className="mono ellipsis" style={{ flex: '1 1 220px', minWidth: 0, fontSize: 13 }}>
                  {p.email}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, width: 140, color: status(p).color }}>{status(p).text}</span>
                <button className="btn btn-outline btn-sm" disabled={invite.isPending} onClick={() => invite.mutate(p)}>
                  {p.invitedAt || p.lastLoginAt ? 'Reinvia invito' : 'Invita'}
                </button>
                <ConfirmButton label="Cancella" confirm="Conferma" url={`/api/admin/users/${p.userId}`} method="DELETE" done={`${p.email} cancellato`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && <PlayerDialog person={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {newAdmin && <AdminDialog onClose={() => setNewAdmin(false)} />}
    </>
  );
}

function PlayerDialog({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<PlayerForm>(
    person?.player
      ? { firstName: person.player.firstName, lastName: person.player.lastName, shortName: person.player.shortName, email: person.email ?? '' }
      : EMPTY,
  );
  const [invite, setInvite] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shortTouched, setShortTouched] = useState(!!person);
  const isNew = !person;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api('/api/admin/players', { method: 'POST', body: { ...form, invite, isAdmin } })
        : api(`/api/admin/players/${person!.player!.id}`, { method: 'PATCH', body: form }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(isNew ? (invite ? `Giocatore creato, invito inviato a ${form.email}` : 'Giocatore creato') : 'Giocatore aggiornato');
      close();
    },
    onError: (e) => toast(e.message),
  });

  const set = (key: keyof PlayerForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [key]: e.target.value };
    // il nome breve segue il nome finché non lo si modifica a mano
    if (key === 'firstName' && !shortTouched) next.shortName = e.target.value;
    if (key === 'shortName') setShortTouched(true);
    setForm(next);
  };
  const valid = form.firstName.trim() && form.lastName.trim() && form.shortName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const emailChanged = !isNew && person?.email && person.email !== form.email.trim().toLowerCase();

  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={isNew ? 'Nuovo giocatore' : 'Modifica giocatore'}>
      <div className="modal-backdrop" onClick={close} />
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display" style={{ fontSize: 32 }}>
            {isNew ? 'Nuovo giocatore' : 'Modifica giocatore'}
          </h2>
          <button type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <TextField label="Nome" style={{ height: 48 }} value={form.firstName} onChange={set('firstName')} autoFocus />
          <TextField label="Cognome" style={{ height: 48 }} value={form.lastName} onChange={set('lastName')} />
          <TextField label="Nome breve" style={{ height: 48 }} value={form.shortName} onChange={set('shortName')} placeholder="Es. Alessandro P" />
          <TextField label="Email" style={{ height: 48 }} type="email" value={form.email} onChange={set('email')} placeholder="nome@email.it" />
        </div>
        {isNew && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14.5 }}>
              <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} style={{ width: 18, height: 18 }} />
              Invia subito l'invito
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14.5 }}>
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ width: 18, height: 18 }} />
              Anche amministratore (entra nel gestionale)
            </label>
          </div>
        )}
        {person && <AccessSection person={person} onDone={close} />}
        {emailChanged && <div className="note note-warn">Cambiando email il giocatore viene scollegato e dovrà essere invitato di nuovo.</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={close}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" style={{ height: 46, fontSize: 14 }} disabled={!valid || save.isPending}>
            {save.isPending ? <ButtonLoader /> : isNew ? (invite ? 'Crea e invita' : 'Crea giocatore') : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Ruolo admin, revoca dell'accesso e cancellazione di un giocatore */
function AccessSection({ person, onDone }: { person: Person; onDone: () => void }) {
  const pl = person.player!;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <span className="kicker faint">Accesso</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {person.userId && !person.disabledAt && (
          <ConfirmButton
            label={person.isAdmin ? 'Togli il ruolo admin' : 'Rendi amministratore'}
            url={`/api/admin/users/${person.userId}/admin`}
            method="PUT"
            body={{ isAdmin: !person.isAdmin }}
            done={person.isAdmin ? 'Non è più amministratore' : 'Ora è amministratore'}
          />
        )}
        {pl.hasMatches
          ? person.userId &&
            !person.disabledAt && (
              <ConfirmButton
                label="Revoca accesso"
                confirm="Conferma revoca"
                danger
                url={`/api/admin/users/${person.userId}/revoke`}
                method="POST"
                done="Accesso revocato"
                onDone={onDone}
              />
            )
          : (
            <ConfirmButton label="Cancella giocatore" confirm="Conferma cancellazione" danger url={`/api/admin/players/${pl.id}`} method="DELETE" done="Giocatore cancellato" onDone={onDone} />
          )}
      </div>
      <span className="faint" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
        {pl.hasMatches
          ? 'Ha partite in calendario, quindi non si cancella: revocando l’accesso non entra più, ma partite e risultati restano. Reinvitarlo lo riattiva.'
          : 'Non ha partite: si può cancellare del tutto.'}
      </span>
    </div>
  );
}

/** Pulsante che agisce subito, oppure al secondo tocco se ha `confirm` (niente finestre del browser) */
function ConfirmButton({
  label,
  confirm,
  danger = false,
  url,
  method,
  body,
  done,
  onDone,
}: {
  label: string;
  confirm?: string;
  danger?: boolean;
  url: string;
  method: string;
  body?: unknown;
  done: string;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const run = useMutation({
    mutationFn: () => api(url, { method, body }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(done);
      onDone?.();
    },
    onError: (e) => {
      setArmed(false);
      toast(e.message);
    },
  });
  // il secondo tocco vale solo per qualche secondo
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`btn btn-sm ${armed || (danger && !confirm) ? 'btn-danger' : 'btn-outline'}`}
      style={danger && !armed ? { color: 'var(--errFg)' } : undefined}
      disabled={run.isPending}
      onClick={() => (confirm && !armed ? setArmed(true) : run.mutate())}
    >
      {run.isPending ? <ButtonLoader height={22} /> : armed ? confirm : label}
    </button>
  );
}

function AdminDialog({ onClose }: { onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState(true);
  const save = useMutation({
    mutationFn: () => api('/api/admin/admins', { method: 'POST', body: { email, invite } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast(invite ? `Amministratore creato, invito inviato a ${email}` : 'Amministratore creato');
      close();
    },
    onError: (e) => toast(e.message),
  });
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Nuovo amministratore">
      <div className="modal-backdrop" onClick={close} />
      <form
        className="modal"
        style={{ width: 'min(480px, 100%)' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display" style={{ fontSize: 32 }}>
            Nuovo amministratore
          </h2>
          <button type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>
        <span className="muted" style={{ fontSize: 13.5 }}>
          Entra solo nel gestionale. Per un giocatore che è anche amministratore usa "Nuovo giocatore" con la spunta.
        </span>
        <TextField label="Email" style={{ height: 48 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.it" autoFocus />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14.5 }}>
          <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} style={{ width: 18, height: 18 }} />
          Invia subito l'invito
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={close}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" style={{ height: 46, fontSize: 14 }} disabled={!valid || save.isPending}>
            {save.isPending ? <ButtonLoader /> : invite ? 'Crea e invita' : 'Crea'}
          </button>
        </div>
      </form>
    </div>
  );
}
