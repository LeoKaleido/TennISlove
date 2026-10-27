import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { api, ApiError } from '../api';
import { ButtonLoader, InstallBanner, Logo, TextField } from '../components/ui';
import { useMe } from '../data';
import { clearDraft, loadDraft, saveDraft } from '../drafts';

// l'email resta salvata: per leggere il codice si passa all'app Mail e il telefono può chiudere l'app
const SENT_TO = 'login';

export function LoginPage() {
  const me = useMe();
  const [sentTo, setSentToState] = useState<string | null>(() => loadDraft<string>(SENT_TO));
  const [email, setEmail] = useState(sentTo ?? '');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  // si entra con la password dell'invito; senza password (o se dimenticata) con un codice via email (D-060)
  const [mode, setMode] = useState<'password' | 'code'>(sentTo ? 'code' : 'password');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const queryClient = useQueryClient();
  const signedIn = async () => {
    clearDraft(SENT_TO);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };
  // "Email non registrata" va sotto l'email, gli altri errori sotto il campo da cui arrivano
  const isUnknownEmail = (e: Error) => e instanceof ApiError && e.status === 404;

  const setSentTo = (to: string | null) => {
    if (to) saveDraft(SENT_TO, to);
    else clearDraft(SENT_TO);
    setSentToState(to);
    setCode('');
    setCodeError('');
  };

  const send = useMutation({
    mutationFn: (to: string) => api('/api/auth/code', { method: 'POST', body: { email: to } }),
    onSuccess: (_, to) => setSentTo(to),
    onError: (e) => setError(e.message),
  });

  const passwordLogin = useMutation({
    mutationFn: () => api('/api/auth/password', { method: 'POST', body: { email: email.trim(), password } }),
    onSuccess: signedIn,
    onError: (e) => (isUnknownEmail(e) ? setError(e.message) : setPasswordError(e.message)),
  });

  const verify = useMutation({
    mutationFn: (value: string) => api('/api/auth/login', { method: 'POST', body: { email: sentTo, code: value } }),
    onSuccess: signedIn,
    onError: (e) => setCodeError(e.message),
  });

  const onCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setCodeError('');
    if (digits.length === 6) verify.mutate(digits);
  };

  if (me.data) return <Navigate to="/" replace />;

  const validEmail = () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return true;
    setError('Inserisci un indirizzo email valido');
    return false;
  };

  const submit = () => {
    if (!validEmail()) return;
    setError('');
    send.mutate(email.trim());
  };

  const submitPassword = () => {
    if (!validEmail() || !password) return;
    setError('');
    setPasswordError('');
    passwordLogin.mutate();
  };

  const switchMode = (next: 'password' | 'code') => {
    setMode(next);
    setError('');
    setPasswordError('');
    setSentTo(null);
  };

  const onEmail = (value: string) => {
    setEmail(value);
    setError('');
    // email cambiata dopo l'invio: il codice mandato non vale per la nuova
    if (sentTo && value.trim().toLowerCase() !== sentTo.toLowerCase()) setSentTo(null);
  };

  return (
    // sfondo: campo in terra rossa dall'alto (foto di Maurits Bausenhart, Unsplash)
    <div className="login-page" style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', color: '#fff', minHeight: '100dvh' }}>
      <div className="login-hero" style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px 24px', gap: 28, position: 'relative', overflow: 'hidden' }}>
        <Logo size={72} inverted />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          <h1 className="display brand" style={{ fontSize: 56, lineHeight: 0.88 }}>
            TennIsLove
          </h1>
        </div>
      </div>

      <div className="login-panel" style={{ background: 'var(--surface)', color: 'var(--ink)', borderRadius: '28px 28px 0 0', padding: '26px 22px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="title" style={{ fontSize: 26 }}>
          Accedi
        </h2>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (mode === 'password' ? submitPassword() : !sentTo && submit())}
          placeholder="nome@email.it"
          error={!!error}
        />
        {error && <div style={{ fontSize: 13, color: 'var(--errFg)', fontWeight: 600, marginTop: -6 }}>{error}</div>}
        {mode === 'password' ? (
          <>
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
              error={!!passwordError}
            />
            {passwordError && <div style={{ fontSize: 13, color: 'var(--errFg)', fontWeight: 600, marginTop: -6 }}>{passwordError}</div>}
            <button className="btn btn-primary" onClick={submitPassword} disabled={!password || passwordLogin.isPending}>
              {passwordLogin.isPending ? <ButtonLoader /> : 'Entra'}
            </button>
            <button className="link-btn" style={{ alignSelf: 'center', fontSize: 13.5 }} onClick={() => switchMode('code')}>
              Password dimenticata? Ricevi un codice
            </button>
          </>
        ) : (
          <>
            {sentTo && (
              <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <TextField
                  label="Codice"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  disabled={verify.isPending}
                  error={!!codeError}
                  style={{ letterSpacing: '0.3em', fontWeight: 700 }}
                />
                {codeError && <div style={{ fontSize: 13, color: 'var(--errFg)', fontWeight: 600, marginTop: -6 }}>{codeError}</div>}
              </div>
            )}
            {sentTo ? (
              <button className="btn btn-primary" onClick={() => verify.mutate(code)} disabled={code.length < 6 || verify.isPending}>
                {verify.isPending ? <ButtonLoader /> : 'Entra'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={send.isPending}>
                {send.isPending ? <ButtonLoader /> : 'Inviami il codice'}
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: sentTo ? 'space-between' : 'center', fontSize: 13.5 }}>
              <button className="link-btn" onClick={() => switchMode('password')}>
                Entra con la password
              </button>
              {sentTo && (
                <button className="link-btn" onClick={() => send.mutate(sentTo)} disabled={send.isPending}>
                  Invia un nuovo codice
                </button>
              )}
            </div>
          </>
        )}
        <InstallBanner atTop />
      </div>
    </div>
  );
}
