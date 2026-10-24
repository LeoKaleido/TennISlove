// Stato di una partita, sempre derivato dai dati (D-029).

import { romeDay } from './dates';

export type ResultStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';

export type MatchStatus =
  | 'TO_SCHEDULE'
  | 'SCHEDULED'
  | 'POSTPONED'
  | 'TO_RECOVER'
  | 'PROVISIONAL'
  | 'CONFIRMED'
  | 'DISPUTED';

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  TO_SCHEDULE: 'Da programmare',
  SCHEDULED: 'Programmata',
  POSTPONED: 'Rinviata',
  TO_RECOVER: 'Da recuperare',
  PROVISIONAL: 'Provvisoria',
  CONFIRMED: 'Confermata',
  DISPUTED: 'Contestata',
};

export interface MatchStatusInput {
  resultStatus: ResultStatus | null;
  scheduledAt: Date | string | null;
  postponed: boolean;
  /** ultimo giorno della settimana della giornata (YYYY-MM-DD) */
  roundEndsOn: string;
}

export function matchStatus(m: MatchStatusInput, now: Date = new Date()): MatchStatus {
  if (m.resultStatus === 'PENDING') return 'PROVISIONAL';
  if (m.resultStatus === 'CONFIRMED') return 'CONFIRMED';
  if (m.resultStatus === 'DISPUTED') return 'DISPUTED';
  if (m.scheduledAt) return romeDay(m.scheduledAt) > m.roundEndsOn ? 'POSTPONED' : 'SCHEDULED';
  if (m.postponed) return 'POSTPONED';
  if (romeDay(now) > m.roundEndsOn) return 'TO_RECOVER';
  return 'TO_SCHEDULE';
}

/** I risultati che entrano in classifica (D-017): provvisori e confermati, non i contestati */
export const COUNTS_IN_STANDINGS: ResultStatus[] = ['PENDING', 'CONFIRMED'];
