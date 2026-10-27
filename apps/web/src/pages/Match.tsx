import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { formatDayWithWeekday, romeDay, romeTime, SURFACE_LABEL } from '@tentennis/shared';
import { api, type MatchDetail } from '../api';
import { Avatar, BackButton, ErrorState, HelpLink, Loading, Logo, ScoreTable, StatusPill, useClosing, useToast } from '../components/ui';
import { PredictionPanel } from '../components/Predictions';
import { Simulator } from '../components/Simulator';
import { isMine, playerIndex, roundRange, today, useMe, useSeason } from '../data';
import { ScheduleSheet } from './ScheduleSheet';
import { WeatherLine } from '../components/Weather';

export function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const detail = useQuery({ queryKey: ['match', id], queryFn: () => api<MatchDetail>(`/api/matches/${id}`) });
  // il torneo della partita, non quello scelto: un link da un'email funziona anche guardando un torneo concluso
  const season = useSeason(detail.data?.seasonId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [photoClosing, closePhoto] = useClosing(() => setOpenPhoto(null));

  const postpone = useMutation({
    mutationFn: () => api(`/api/matches/${id}/postpone`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Partita rinviata');
    },
    onError: (e) => toast(e.message),
  });

  if (detail.isLoading || season.isLoading) return <Loading />;
  if (!detail.data || !season.data) return <ErrorState error={detail.error ?? season.error} />;

  const { match: m, club, round, googleCalendarUrl } = detail.data;
  const players = playerIndex(season.data.players);
  const a = players.get(m.playerAId)!;
  const b = players.get(m.playerBId)!;
  const myId = me.data?.playerId ?? null;
  const mine = isMine(m, myId);
  // Nell'app agiscono solo i due giocatori; l'admin gestisce dal gestionale
  const canAct = mine;
  const sheetOpen = params.has('programma') && canAct && !m.result;
  const r = m.result;
  const predictions = season.data.matches.find((x) => x.id === m.id)?.predictions;

  const day = m.scheduledAt ? romeDay(m.scheduledAt) : null;
  const awaitingMe = r?.status === 'PENDING' && mine && r.submittedByPlayerId !== myId;
  const center = r ? `${r.pointsA}-${r.pointsB}` : 'vs';

  let note: { text: string; tone: 'ok' | 'warn' | 'err' | 'info' } | null = null;
  if (r?.status === 'PENDING') {
    const other = r.submittedByPlayerId === m.playerAId ? b.shortName : a.shortName;
    const when = r.autoConfirmAt ? formatDayWithWeekday(romeDay(r.autoConfirmAt)) : '';
    note = { text: `In attesa di conferma da ${other}, altrimenti si conferma da solo ${when}.`, tone: 'info' };
  } else if (r?.status === 'DISPUTED') {
    note = { text: `Contestato: "${r.disputeNote}"`, tone: 'err' };
  }

  // Azione principale per chi gioca la partita
  let primary: { label: string; to: string } | null = null;
  if (canAct) {
    if (awaitingMe) primary = { label: 'Conferma o contesta il risultato', to: `/partite/${m.id}/conferma` };
    else if (!r && day && day <= today()) primary = { label: 'Inserisci risultato', to: `/partite/${m.id}/risultato` };
    else if (!r && !day) primary = { label: 'Programma la partita', to: '?programma=1' };
    else if (r?.status === 'PENDING' && r.submittedByPlayerId === myId) primary = { label: 'Correggi il risultato', to: `/partite/${m.id}/risultato` };
  }

  return (
    <div className="screen" style={{ gap: 0, paddingBottom: 28 }}>
      <div style={{ position: 'relative', height: 300, flex: 'none', background: m.coverPhotoUrl ? `url(${m.coverPhotoUrl}) center/cover` : '#0B1A24', overflow: 'hidden' }}>
        {!m.coverPhotoUrl && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 200, height: 400, transform: 'translate(-50%,-50%) rotate(-12deg)', border: '2px solid rgba(198,238,219,.13)' }} />
            <Logo size={92} inverted />
            <div className="display brand" style={{ position: 'relative', fontSize: 26, color: '#C6EEDB' }}>
              TennIsLove
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 14, left: 14 }}>
          <BackButton />
        </div>
        {mine && (
          <Link
            to={`/partite/${m.id}/foto`}
            style={{ position: 'absolute', top: 14, right: 14, height: 42, padding: '0 14px', borderRadius: 99, background: 'rgba(11,26,36,.72)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            + Foto
          </Link>
        )}
        <div style={{ position: 'absolute', left: 14, bottom: 40, padding: '6px 11px', borderRadius: 99, background: '#C6EEDB', color: '#0B1A24', fontSize: 12, fontWeight: 800 }}>
          Giornata {round.number}, {roundRange(round)}
        </div>
      </div>

      <div style={{ margin: '-26px 10px 0', position: 'relative', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--line)', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 8 }}>
          {[a, b].map((p, i) => (
            <Link key={p.id} to={`/giocatori/${p.id}`} style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', textAlign: 'center' }}>
              <Avatar player={p} size={58} />
              <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                {p.firstName} {p.lastName}
              </span>
            </Link>
          ))}
          <div style={{ gridColumn: 2, gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 6 }}>
            <StatusPill status={m.status} />
            <span className="display" style={{ fontSize: 40, lineHeight: 1 }}>
              {center}
            </span>
          </div>
        </div>

        {r && (
          <div style={{ borderRadius: 16, background: 'var(--bg)', padding: '6px 12px' }}>
            <ScoreTable match={m} players={players} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <Info label="Settimana" value={roundRange(round)} />
          <Info label="Data" value={day ? formatDayWithWeekday(day) : 'Da decidere'} />
          <Info label="Ora" value={m.scheduledAt ? romeTime(m.scheduledAt) : 'Da decidere'} />
          <Info label="Circolo" value={club ? club.name : (m.venue ?? 'Da decidere')} href={club?.mapsUrl ?? undefined} />
          {m.surface && <Info label="Superficie" value={SURFACE_LABEL[m.surface]} wide />}
        </div>

        <WeatherLine matchId={m.id} enabled={!!m.scheduledAt && !!club && !r} />

        {note && <div className={`note note-${note.tone}`}>{note.text}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {primary && (
            <Link to={primary.to} className="btn btn-primary">
              {primary.label}
            </Link>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canAct && !r && day && (
              <Link to="?programma=1" className="btn btn-outline" style={{ flex: '1 1 140px' }}>
                Modifica programma
              </Link>
            )}
            {canAct && !r && m.status !== 'POSTPONED' && (
              <button className="btn btn-outline" style={{ flex: '1 1 140px' }} onClick={() => postpone.mutate()} disabled={postpone.isPending}>
                Segna come rinviata
              </button>
            )}
            {m.scheduledAt && !r && (
              <>
                <a className="btn btn-outline" style={{ flex: '1 1 140px' }} href={`/api/matches/${m.id}/calendar.ics`}>
                  Aggiungi al calendario
                </a>
                {googleCalendarUrl && (
                  <a className="btn btn-outline" style={{ flex: '1 1 140px' }} href={googleCalendarUrl} target="_blank" rel="noreferrer">
                    Google Calendar
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {mine && myId && !r && m.phase === 'ROUND_ROBIN' && season.data.season.status === 'ACTIVE' && (
        <section style={{ padding: '22px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-head">
            <h2 className="title with-help">
              Cosa ti serve <HelpLink to="simulatore" label="cosa ti serve" />
            </h2>
          </div>
          <Simulator match={m} data={season.data} myId={myId} />
        </section>
      )}

      {predictions && (predictions.open || predictions.count > 0) && (
        <section style={{ padding: '22px 14px 0' }}>
          <div className="card" style={{ padding: 16 }}>
            <PredictionPanel match={m} predictions={predictions} players={players} />
            <Link to="/pronostici" className="link-btn" style={{ display: 'block', marginTop: 12 }}>
              Tutti i pronostici
            </Link>
          </div>
        </section>
      )}

      {(detail.data.photos.length > 0 || mine) && (
        <section style={{ padding: '22px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-head">
            <h2 className="title with-help">
              Foto della partita <HelpLink to="foto" label="foto" />
            </h2>
            <span className="faint" style={{ fontSize: 12.5 }}>
              {detail.data.photos.length === 1 ? '1 foto' : `${detail.data.photos.length} foto`}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {detail.data.photos.map((p) => (
              <button
                key={p.id}
                aria-label="Apri foto"
                onClick={() => setOpenPhoto(p.url)}
                style={{ aspectRatio: '1', borderRadius: 14, border: 0, padding: 0, background: `var(--surface2) url(${p.url}) center/cover`, position: 'relative' }}
              >
                {m.coverPhotoUrl === p.url && (
                  <span style={{ position: 'absolute', left: 6, top: 6, padding: '2px 6px', borderRadius: 6, background: '#0B1A24', color: '#C6EEDB', fontSize: 10, fontWeight: 700 }}>Copertina</span>
                )}
              </button>
            ))}
            {mine && (
              <Link
                to={`/partite/${m.id}/foto`}
                style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed var(--line2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--ink2)', textDecoration: 'none' }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Aggiungi</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {openPhoto && (
        <div className={`modal-wrap${photoClosing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Foto" onClick={closePhoto}>
          <div className="modal-backdrop" style={{ background: 'rgba(0,0,0,.88)' }} />
          <img className="lightbox-img" src={openPhoto} alt="Foto della partita" style={{ position: 'relative', maxWidth: '100%', maxHeight: 'calc(100dvh - 40px)', borderRadius: 12 }} />
        </div>
      )}

      {sheetOpen && (
        <ScheduleSheet
          match={m}
          round={round}
          clubs={season.data.clubs}
          title={`${a.shortName} vs ${b.shortName}`}
          onClose={() => {
            params.delete('programma');
            setParams(params, { replace: true });
          }}
        />
      )}
    </div>
  );
}

/** `wide`: su tutta la larghezza della griglia (la quinta casella, la superficie) */
function Info({ label, value, href, wide = false }: { label: string; value: string; href?: string; wide?: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, gridColumn: wide ? '1 / -1' : undefined }}>
      <span className="faint" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 14 }}>
          {value}
        </a>
      ) : (
        <span style={{ fontWeight: 700, fontSize: 14 }}>{value}</span>
      )}
    </div>
  );
}
