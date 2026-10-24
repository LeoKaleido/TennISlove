import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addDays, formatDayWithWeekday, romeDay, romeTime } from '@tentennis/shared';
import { api, type Club, type Match, type Round } from '../api';
import { useToast } from '../components/ui';

const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** Bottom sheet "Programma partita": giorno della settimana (o altra data), ora, circolo */
export function ScheduleSheet({
  match,
  round,
  clubs,
  title,
  onClose,
}: {
  match: Match;
  round: Pick<Round, 'number' | 'startsOn' | 'endsOn'>;
  clubs: Club[];
  title: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const days: string[] = [];
  for (let d = round.startsOn; d <= round.endsOn; d = addDays(d, 1)) days.push(d);

  const initialDay = match.scheduledAt ? romeDay(match.scheduledAt) : null;
  const inWeek = !!initialDay && days.includes(initialDay);
  const [day, setDay] = useState<string | null>(inWeek ? initialDay : null);
  const [otherOn, setOtherOn] = useState(!!initialDay && !inWeek);
  const [otherDate, setOtherDate] = useState(initialDay && !inWeek ? initialDay : '');
  const [time, setTime] = useState<string | null>(match.scheduledAt ? romeTime(match.scheduledAt) : null);
  const [clubId, setClubId] = useState<string | null>(match.clubId);

  const date = otherOn ? otherDate || null : day;
  const outside = !!date && date > round.endsOn;
  const before = !!date && date < round.startsOn;
  const ready = !!date && !!time && !!clubId && !before;

  const save = useMutation({
    mutationFn: () => api(`/api/matches/${match.id}/schedule`, { method: 'PUT', body: { date, time, clubId } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Partita programmata: vi arriva un\'email con l\'invito per il calendario');
      onClose();
    },
    onError: (e) => toast(e.message),
  });

  return (
    <div className="sheet-wrap">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Programma partita">
        <div className="sheet-handle" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="display" style={{ fontSize: 32, lineHeight: 0.95 }}>
            Programma partita
          </span>
          <span className="muted" style={{ fontSize: 13.5 }}>
            {title}, entro {formatDayWithWeekday(round.endsOn)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SheetLabel>Giorno</SheetLabel>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length},1fr)`, gap: 5 }}>
            {days.map((d) => {
              const on = !otherOn && day === d;
              const [, , dd] = d.split('-');
              const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
              return (
                <button
                  key={d}
                  aria-pressed={on}
                  onClick={() => {
                    setDay(d);
                    setOtherOn(false);
                  }}
                  style={{
                    height: 60,
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: 0,
                    background: on ? 'var(--accent)' : 'var(--surface)',
                    color: on ? 'var(--onAccent)' : 'var(--ink)',
                    border: on ? '1.5px solid var(--accent)' : '1.5px solid var(--line2)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>{WEEKDAYS[wd]}</span>
                  <span style={{ fontWeight: 900, fontStretch: '70%', fontSize: 22, lineHeight: 1 }}>{Number(dd)}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="chip" aria-pressed={otherOn} onClick={() => setOtherOn(!otherOn)}>
              Altra data
            </button>
            {otherOn && (
              <input className="input" type="date" value={otherDate} min={round.startsOn} onChange={(e) => setOtherDate(e.target.value)} style={{ height: 40, borderRadius: 12, fontSize: 14 }} />
            )}
          </div>
          {outside && <div className="note note-warn">È dopo la settimana della giornata {round.number}: la partita risulterà rinviata.</div>}
          {before && <div className="note note-err">La giornata {round.number} inizia {formatDayWithWeekday(round.startsOn)}.</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SheetLabel>Ora</SheetLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TIMES.map((t) => (
              <button key={t} className="chip" aria-pressed={time === t} onClick={() => setTime(t)}>
                {t}
              </button>
            ))}
            <input
              className="input"
              type="time"
              aria-label="Altro orario"
              value={time && !TIMES.includes(time) ? time : ''}
              onChange={(e) => setTime(e.target.value || null)}
              style={{ height: 40, width: 120, borderRadius: 12, fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SheetLabel>Circolo</SheetLabel>
          <div className="card" style={{ borderRadius: 16 }}>
            {clubs.map((c) => {
              const on = clubId === c.id;
              return (
                <button key={c.id} className="list-row" onClick={() => setClubId(c.id)} style={{ padding: '11px 14px', background: on ? 'color-mix(in oklch, var(--mint) 35%, transparent)' : undefined }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', border: on ? '6px solid var(--accent)' : '2px solid var(--line2)', background: 'var(--surface)' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</span>
                    {c.city && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {c.city}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn btn-primary" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Salvataggio…' : ready ? 'Salva e avvisa l\'avversario' : 'Scegli giorno, ora e circolo'}
        </button>
      </div>
    </div>
  );
}

function SheetLabel({ children }: { children: string }) {
  return (
    <span className="faint" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
      {children}
    </span>
  );
}
