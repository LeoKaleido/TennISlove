// Tabelle del gestionale (giocatori, risultati, circoli): azioni a icona con spiegazione al passaggio del mouse.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useToast } from './ui';

const ICONS: Record<string, ReactNode> = {
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  invite: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  'admin-off': (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" />
      <path d="M9 12h6" />
    </>
  ),
  revoke: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  delete: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  unschedule: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4" />
    </>
  ),
  add: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  confirm: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

/** Azione a icona con la spiegazione al passaggio del mouse; con `confirm` agisce al secondo clic, con `href` apre un link */
export function IconAction({
  icon,
  tip,
  href,
  onClick,
  url,
  method,
  body,
  done,
  danger = false,
  confirm = false,
}: {
  icon: keyof typeof ICONS;
  tip: string;
  href?: string;
  onClick?: () => void;
  url?: string;
  method?: string;
  body?: unknown;
  done?: string;
  danger?: boolean;
  confirm?: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const run = useMutation({
    mutationFn: () => api(url!, { method, body }),
    onSuccess: () => {
      setArmed(false);
      queryClient.invalidateQueries();
      if (done) toast(done);
    },
    onError: (e) => {
      setArmed(false);
      toast(e.message);
    },
  });
  // il secondo clic vale solo per qualche secondo
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const label = armed ? `Clicca di nuovo per confermare: ${tip.split(':')[0]!.toLowerCase()}` : tip;
  const svg = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[icon]}
    </svg>
  );
  if (href) {
    return (
      <a className="icon-action tip" href={href} target="_blank" rel="noreferrer" aria-label={tip} data-tip={tip}>
        {svg}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={`icon-action tip${danger ? ' danger' : ''}${armed ? ' armed' : ''}`}
      aria-label={label}
      data-tip={label}
      disabled={run.isPending}
      onClick={() => (onClick ? onClick() : confirm && !armed ? setArmed(true) : run.mutate())}
    >
      {svg}
    </button>
  );
}
