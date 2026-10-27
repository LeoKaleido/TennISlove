// Impostazioni dell'account: installa l'app, password, torneo, guida, esci.
// Nel profilo si aprono dall'ingranaggio; su desktop esci sta anche nella barra laterale.

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLogout } from '../account';
import { api } from '../api';
import { useMe } from '../data';
import { iosInstallHint, useInstall } from '../pwa';
import { SeasonPicker } from './SeasonPicker';
import { ButtonLoader, Collapse, HelpLink, TextField, useClosing, useToast } from './ui';

export function SettingsList() {
  const logout = useLogout();
  const install = useInstall();
  const toast = useToast();
  const [installHelp, setInstallHelp] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const savePassword = useMutation({
    mutationFn: () => api('/api/me/password', { method: 'POST', body: { password: newPassword } }),
    onSuccess: () => {
      setPwOpen(false);
      setNewPassword('');
      toast('Password cambiata');
    },
    onError: (e) => setPwError(e.message),
  });
  const submitPassword = () => {
    if (newPassword.length < 8) return setPwError('Almeno 8 caratteri');
    savePassword.mutate();
  };

  return (
    <div className="card settings-list">
      {/* Android apre il prompt di sistema; su iPhone il menu Condividi, con sotto cosa scegliere */}
      {install.available && (
        <>
          <button
            className="list-row"
            onClick={() => {
              if (install.prompt) return install.prompt();
              setInstallHelp(install.share ? true : !installHelp);
              install.share?.();
            }}
          >
            <span className="settings-label">Installa l'app</span>
          </button>
          <Collapse open={installHelp}>
            <div className="note note-info" style={{ margin: '0 14px 12px' }}>
              {iosInstallHint()}
            </div>
          </Collapse>
        </>
      )}
      <button className="list-row" onClick={() => setPwOpen(!pwOpen)} aria-expanded={pwOpen}>
        <span className="settings-label">Cambia password</span>
      </button>
      <Collapse open={pwOpen}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 14px 14px' }}>
          <TextField
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPwError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
            error={!!pwError}
          />
          {pwError && <div className="field-error">{pwError}</div>}
          <button className="btn btn-primary" style={{ height: 50 }} onClick={submitPassword} disabled={!newPassword || savePassword.isPending}>
            {savePassword.isPending ? <ButtonLoader /> : 'Salva'}
          </button>
        </div>
      </Collapse>
      <label className="list-row">
        <span className="settings-label with-help">
          Torneo <HelpLink to="torneo" label="scegliere il torneo" />
        </span>
        <SeasonPicker short />
      </label>
      <Link to="/guida" className="list-row">
        <span className="settings-label">Guida all'app</span>
        <span className="muted">›</span>
      </Link>
      {/* su desktop esci sta nella barra laterale */}
      <button className="list-row hide-desktop" onClick={() => logout.mutate()} disabled={logout.isPending}>
        <span className="settings-label" style={{ color: 'var(--errFg)' }}>
          Esci
        </span>
      </button>
    </div>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [closing, close] = useClosing(onClose);
  const me = useMe();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div className={`sheet-wrap${closing ? ' closing' : ''}`}>
      <div className="sheet-backdrop" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Impostazioni">
        <div className="sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span className="display with-help" style={{ fontSize: 32, lineHeight: 0.95 }}>
              Impostazioni <HelpLink to="impostazioni" label="impostazioni" />
            </span>
            <span className="muted ellipsis" style={{ fontSize: 13 }}>
              {me.data?.email}
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            ✕
          </button>
        </div>
        <SettingsList />
      </div>
    </div>
  );
}

/** Ingranaggio che apre le impostazioni */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="icon-btn" aria-label="Impostazioni" onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM19.4 13.5a7.6 7.6 0 000-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 00-2.6-1.5L14.2 2.6h-4l-.4 2.5a7.6 7.6 0 00-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 000 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 002.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 002.6-1.5l2.3 1 2-3.4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <SettingsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
