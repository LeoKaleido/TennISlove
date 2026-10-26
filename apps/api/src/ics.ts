// Evento calendario (.ics) e link Google Calendar per una partita programmata (D-013).

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export interface CalendarEvent {
  /** id stabile: lo stesso evento viene aggiornato a ogni riprogrammazione */
  uid: string;
  sequence: number;
  start: Date;
  durationMinutes: number;
  title: string;
  location: string;
  description: string;
}

export function toIcs(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TennIsLove//IT',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}@tennislove`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    `LOCATION:${escape(e.location)}`,
    `DESCRIPTION:${escape(e.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(end)}`,
    location: e.location,
    details: e.description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
