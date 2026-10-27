// Titolo delle schede del gestionale, con a destra un controllo (es. la scelta del torneo).

import type { ReactNode } from 'react';

export function AdminHeader({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 0.92 }}>
          {title}
        </h1>
        {sub && (
          <span className="muted" style={{ fontSize: 13.5 }}>
            {sub}
          </span>
        )}
      </div>
      {aside}
    </div>
  );
}
