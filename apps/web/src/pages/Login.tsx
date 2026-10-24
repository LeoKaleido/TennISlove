import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { Logo } from '../components/ui';
import { useMe } from '../data';

export function LoginPage() {
  const me = useMe();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const send = useMutation({
    mutationFn: (to: string) => api('/api/auth/magic-link', { method: 'POST', body: { email: to } }),
    onSuccess: (_, to) => setSentTo(to),
    onError: (e) => setError(e.message),
  });

  if (me.data) return <Navigate to="/" replace />;

  const submit = () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Inserisci un indirizzo email valido');
      return;
    }
    setError('');
    send.mutate(value);
  };

  return (
    <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', background: '#0B1A24', color: '#fff', minHeight: '100dvh' }}>
      <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px 24px', gap: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -40, width: 260, height: 380, border: '2px solid rgba(198,238,219,.14)', borderRadius: 6 }} />
        <div style={{ position: 'absolute', right: -60, top: 150, width: 260, borderTop: '2px solid rgba(198,238,219,.14)' }} />
        <Logo size={72} inverted />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          <h1 className="display" style={{ fontSize: 58, lineHeight: 0.88 }}>
            ATP Umbria
            <br />
            Tournament
          </h1>
          <div style={{ fontSize: 15, color: '#C6EEDB', fontWeight: 600 }}>Amici Tennis, Pre-cena</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', color: 'var(--ink)', borderRadius: '28px 28px 0 0', padding: '26px 22px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!sentTo ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="title" style={{ fontSize: 26 }}>
                Accedi
              </h2>
              <div className="muted" style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                Niente password: inserisci la tua email e ti mandiamo un link per entrare.
              </div>
            </div>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="nome@email.it"
                style={{ borderColor: error ? 'var(--errFg)' : undefined }}
              />
            </label>
            {error && <div style={{ fontSize: 13, color: 'var(--errFg)', fontWeight: 600, marginTop: -6 }}>{error}</div>}
            <button className="btn btn-primary" onClick={submit} disabled={send.isPending}>
              {send.isPending ? 'Invio…' : 'Inviami il link'}
            </button>
            <div className="faint" style={{ fontSize: 12.5, textAlign: 'center' }}>
              App privata: accedono solo i giocatori del torneo.
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <rect x="3" y="6" width="22" height="16" rx="3" fill="none" stroke="#0B1A24" strokeWidth="2.2" />
                <path d="M4 8l10 7 10-7" fill="none" stroke="#0B1A24" strokeWidth="2.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="title" style={{ fontSize: 26 }}>
                Controlla la tua email
              </h2>
              <div className="muted" style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                Se <strong style={{ color: 'var(--ink)' }}>{sentTo}</strong> è tra i giocatori del torneo, ti è arrivato il link di
                accesso. Aprilo da questo telefono: vale 15 minuti.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <button className="link-btn" style={{ color: 'var(--ink2)', fontWeight: 600 }} onClick={() => setSentTo(null)}>
                Usa un'altra email
              </button>
              <button className="link-btn" onClick={() => send.mutate(sentTo)}>
                Invia di nuovo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
