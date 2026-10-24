import { Link } from 'react-router-dom';
import type { Match, SeasonOverview } from '../api';
import { matchInfo, playerIndex } from '../data';
import { StatusPill } from './ui';

/** Riga di una partita in un elenco (Home, Calendario, Profilo) */
export function MatchRow({
  match,
  data,
  highlight = false,
  title,
}: {
  match: Match;
  data: SeasonOverview;
  highlight?: boolean;
  title?: string;
}) {
  const players = playerIndex(data.players);
  const a = players.get(match.playerAId)!;
  const b = players.get(match.playerBId)!;
  const clubName = (id: string | null) => data.clubs.find((c) => c.id === id)?.name;
  return (
    <Link
      to={`/partite/${match.id}`}
      className="list-row"
      style={{ background: highlight ? 'color-mix(in oklch, var(--mint) 28%, transparent)' : undefined }}
    >
      <div className="row-main">
        <span className="row-title">{title ?? `${a.shortName} vs ${b.shortName}`}</span>
        <span className="row-sub">{matchInfo(match, data.rounds, clubName)}</span>
      </div>
      <StatusPill status={match.status} />
    </Link>
  );
}
