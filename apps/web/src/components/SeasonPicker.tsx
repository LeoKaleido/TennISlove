// Scelta del torneo (D-068): vale per tutta l'app. Nelle impostazioni e, su desktop, in cima alla barra laterale.

import { Link } from 'react-router';
import { selectSeason, useSeason, useSeasons, useSelectedSeasonId } from '../data';

const STATUS: Record<string, string> = { ACTIVE: 'in corso', ARCHIVED: 'concluso' };

/** `short`: dove la riga si chiama già "Torneo" (impostazioni) basta l'anno */
export function SeasonPicker({ className, short = false }: { className?: string; short?: boolean }) {
  const seasons = useSeasons();
  const season = useSeason();
  const list = seasons.data ?? [];
  const current = season.data?.season.id;
  if (list.length === 0 || !current) return null;
  const sameName = list.every((s) => s.name === list[0]!.name);
  return (
    <select
      className={`season-picker${className ? ` ${className}` : ''}`}
      aria-label="Torneo"
      value={current}
      // il torneo in corso non si ricorda: resta quello anche quando ne parte uno nuovo
      onChange={(e) => selectSeason(list.find((s) => s.id === e.target.value)?.status === 'ACTIVE' ? null : e.target.value)}
      disabled={list.length < 2}
    >
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {/* il nome solo se i tornei si chiamano in modo diverso: altrimenti basta l'anno */}
          {sameName ? (short ? s.label : `Torneo ${s.label}`) : `${s.name} ${s.label}`}
          {list.length > 1 && STATUS[s.status] ? `, ${STATUS[s.status]}` : ''}
        </option>
      ))}
    </select>
  );
}

/** In cima alle pagine quando si guarda un torneo che non è quello in corso */
export function SeasonBanner() {
  const season = useSeason();
  const chosen = useSelectedSeasonId();
  const s = season.data?.season;
  if (!s || s.status === 'ACTIVE') return null;
  // senza una scelta è l'ultimo concluso: tra un torneo e l'altro non c'è un torneo in corso a cui tornare
  return (
    <div className="season-banner" role="status">
      <span>
        {chosen ? 'Stai guardando il torneo' : 'Il torneo'} <strong>{s.label}</strong>
        {chosen ? ', concluso.' : ' è concluso: il prossimo non è ancora iniziato.'}
      </span>
      {chosen && (
        <Link to="#" className="link-btn" onClick={(e) => (e.preventDefault(), selectSeason(null))}>
          Torna a quello in corso
        </Link>
      )}
    </div>
  );
}
