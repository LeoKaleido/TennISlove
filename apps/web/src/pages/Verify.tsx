import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Logo } from '../components/ui';

/** Pagina aperta dal link nell'email: scambia il token con la sessione */
export function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token');
    if (!token) {
      setError('Link non valido.');
      return;
    }
    api('/api/auth/verify', { method: 'POST', body: { token } })
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['me'] });
        navigate('/', { replace: true });
      })
      .catch((e: Error) => setError(e.message));
  }, [params, navigate, queryClient]);

  return (
    <div className="center-state" style={{ minHeight: '100dvh', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Logo size={56} />
        {error ? (
          <>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{error}</div>
            <Link to="/login" className="btn btn-primary">
              Richiedi un nuovo link
            </Link>
          </>
        ) : (
          <div>Accesso in corso…</div>
        )}
      </div>
    </div>
  );
}
