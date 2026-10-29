// Guida all'app (D-067): ogni funzione spiegata ai giocatori, con screenshot del torneo dimostrativo.
// Le sezioni hanno un id: il punto interrogativo accanto a ogni funzione (HelpLink) porta a /guida#id.

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { PREDICTION_POINTS } from '@tentennis/shared';
import { BackButton } from '../components/ui';
import IMAGE_SIZES from '../guide-images.json';

/** larghezza e altezza di ogni screenshot, scritte da scripts/guida/screenshots.mjs */
const SIZE: Record<string, number[]> = IMAGE_SIZES;

export type GuideId =
  | 'accesso'
  | 'home'
  | 'programmare'
  | 'partita'
  | 'meteo'
  | 'risultato'
  | 'conferma'
  | 'punti'
  | 'classifica'
  | 'calendario'
  | 'simulatore'
  | 'pronostici'
  | 'badge'
  | 'card'
  | 'andamento'
  | 'testa-a-testa'
  | 'foto'
  | 'impostazioni'
  | 'torneo';

interface Section {
  id: GuideId;
  title: string;
  images?: string[];
  body: ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'accesso',
    title: 'Entrare e installare l’app',
    body: (
      <>
        <p>Entri con l’email e la password che trovi nell’email di invito. Se non la ricordi, tocca “Password dimenticata? Ricevi un codice”: ti arriva un codice di 6 cifre per entrare.</p>
        <p>
          Puoi installare TennIsLove come un’app sul telefono: dalle <a href="#impostazioni">impostazioni</a> tocca “Installa l’app”. Su Android si apre subito l’installazione; su iPhone si fa da Safari: Condividi, poi “Aggiungi alla schermata Home”.
        </p>
      </>
    ),
  },
  {
    id: 'home',
    title: 'La Home',
    images: ['home'],
    body: (
      <>
        <p>In alto c’è il nome del torneo, la giornata in corso e la tua partita, con il pulsante per la cosa da fare adesso: programmarla, inserire il risultato o confermare quello inserito dall’avversario.</p>
        <p>Sotto trovi le altre partite della settimana, i <a href="#pronostici">pronostici</a> da fare, gli ultimi risultati e i primi della classifica.</p>
        <p>In basso c’è la barra delle sezioni: se non vedi tutte le voci, scorrila di lato.</p>
      </>
    ),
  },
  {
    id: 'programmare',
    title: 'Programmare una partita',
    images: ['programma'],
    body: (
      <>
        <p>Ogni giornata dura una settimana: tu e il tuo avversario decidete giorno, ora e circolo. Dalla partita tocca “Programma la partita”, scegli il giorno (o “Altra data” se giocate dopo la settimana), l’ora e il circolo, oppure scrivi tu dove giocate se il campo non è in lista. Se il circolo ha campi diversi (terra, cemento, erba sintetica…) scegli anche la superficie; se ne ha uno solo è già indicata.</p>
        <p>Salvando, a entrambi arriva un’email con il file da aggiungere al calendario del telefono. Se non riuscite a giocare, “Segna come rinviata”: la partita si recupera quando volete. Se invece volete solo ripartire da zero, “Togli dal programma” la riporta da programmare; se l’avevate aggiunta al calendario del telefono, toglietela da lì.</p>
      </>
    ),
  },
  {
    id: 'partita',
    title: 'La scheda della partita',
    images: ['partita'],
    body: (
      <p>
        Tocca una partita ovunque nell’app per aprirla: chi gioca, quando e dove, il <a href="#meteo">meteo</a>, il risultato con i punti, le foto e i <a href="#pronostici">pronostici</a> degli altri. Sulle tue partite da giocare c’è anche{' '}
        <a href="#simulatore">“Cosa ti serve”</a>. Il nome del circolo apre la mappa.
      </p>
    ),
  },
  {
    id: 'meteo',
    title: 'Il meteo',
    images: ['meteo'],
    body: (
      <p>
        Quando la partita è programmata in un circolo della lista, la scheda mostra le previsioni per quel posto nelle 2 ore di gioco: il tempo, la temperatura all’inizio, la probabilità di pioggia e il vento. Se la pioggia è probabile la riga si colora. Le previsioni arrivano fino a 16 giorni prima.
      </p>
    ),
  },
  {
    id: 'risultato',
    title: 'Inserire il risultato',
    images: ['risultato'],
    body: (
      <>
        <p>Dopo la partita uno dei due inserisce il risultato: i game dei due set e, se finisce un set pari, il super tie break a 10. Mentre scrivi vedi subito i punti che prende ciascuno.</p>
        <p>Se scadono le 2 ore senza un vincitore, spunta “Tempo scaduto”: ognuno prende solo i game vinti. Dopo il risultato puoi aggiungere le foto della partita.</p>
      </>
    ),
  },
  {
    id: 'conferma',
    title: 'Confermare o contestare',
    images: ['conferma'],
    body: (
      <p>
        Il risultato inserito da uno dei due è provvisorio finché l’altro non lo conferma: all’avversario arriva un’email. Se è giusto tocca “Conferma”; se non lo è, “Contesta” e scrivi cosa non va: decide un amministratore. Senza risposta si conferma da solo dopo 2 giorni. I risultati provvisori contano già in classifica.
      </p>
    ),
  },
  {
    id: 'punti',
    title: 'Come si fanno i punti',
    body: (
      <>
        <p>Ogni game conta: prendi un punto per ogni game vinto, più un bonus se vinci.</p>
        <ul>
          <li>Vittoria in 2 set: game vinti + 3.</li>
          <li>Vittoria al super tie break: game vinti + 3, più la differenza se hai fatto meno game dell’avversario.</li>
          <li>Sconfitta, o tempo scaduto senza vincitore: solo i game vinti.</li>
        </ul>
        <p>Per questo anche una sconfitta combattuta vale: perdere 6-7 6-7 dà 12 punti, vincere 6-0 6-0 ne dà 15.</p>
      </>
    ),
  },
  {
    id: 'classifica',
    title: 'La classifica',
    images: ['classifica'],
    body: (
      <p>
        I giocatori in ordine di punti. A pari punti conta lo scontro diretto; tra tre o più, i punti negli scontri tra loro e poi la differenza game. Tocca un giocatore per vedere i dettagli. La linea segna chi andrebbe alla fase finale. In alto puoi passare alla classifica dei{' '}
        <a href="#pronostici">pronostici</a>.
      </p>
    ),
  },
  {
    id: 'calendario',
    title: 'Il calendario',
    images: ['calendario'],
    body: <p>Tutte le giornate con le loro partite: quelle giocate con il risultato, quelle programmate con giorno e circolo, quelle da programmare o da recuperare.</p>,
  },
  {
    id: 'simulatore',
    title: 'Cosa ti serve',
    images: ['simulatore-dettaglio'],
    body: (
      <>
        <p>Nella scheda di una tua partita ancora da giocare vedi dove finiresti in classifica con alcuni risultati tipici, da “Vinci 6-0 6-0” a “Perdi 0-6 0-6”: i punti che prenderesti, la tua posizione (▲ sali, ▼ scendi) e quella dell’avversario.</p>
        <p>Tocca un risultato per vedere la parte di classifica intorno a voi due come sarebbe dopo la partita.</p>
      </>
    ),
  },
  {
    id: 'pronostici',
    title: 'I pronostici',
    images: ['pronostici', 'classifica-pronostici'],
    body: (
      <>
        <p>
          Indovina chi vince le partite degli altri, dalla pagina Pronostici: la trovi nella barra delle sezioni, dalla Home e dalla scheda di una partita. Scegli il vincitore e, se vuoi, come vince: in 2 set o al super tie break. Puoi cambiare idea fino all’inizio della partita; dopo il voto vedi come hanno votato gli altri, e a pronostici chiusi anche chi ha scelto cosa.
        </p>
        <ul>
          <li>Vincitore giusto: {PREDICTION_POINTS.winner} punti.</li>
          <li>Anche il modo giusto: +{PREDICTION_POINTS.how}.</li>
          <li>Colpo grosso: +{PREDICTION_POINTS.upset} se hai indovinato un vincitore scelto al massimo da 1 votante su 4.</li>
        </ul>
        <p>I punti dei pronostici hanno una classifica a parte e non cambiano quella del torneo. Con tempo scaduto senza vincitore il pronostico non conta. A fine stagione il primo è l’Oracolo.</p>
      </>
    ),
  },
  {
    id: 'badge',
    title: 'I badge',
    images: ['badge', 'badge-dettaglio'],
    body: (
      <>
        <p>Riconoscimenti che ottieni giocando: la prima vittoria, un set vinto 6-0 (Cappotto), una rimonta, 3 vittorie di fila (Tris), battere il primo in classifica (Ammazza grandi), i pronostici giusti e altri. Li trovi nel profilo: quelli presi a colori, gli altri in grigio.</p>
        <p>Due badge viola premiano la fedeltà: Presenze sale di un livello per ogni torneo a cui partecipi, Veterano per ogni anno da quando sei iscritto.</p>
        <p>Tocca un badge: dal basso sale un riquadro con come si ottiene, in quali tornei l’hai preso e cosa ti manca per il prossimo livello. Si chiude con la ✕ o toccando fuori. Se prendi un badge più volte sale di livello (×2, ×3). I più difficili hanno il bordo di bronzo, d’argento o d’oro.</p>
      </>
    ),
  },
  {
    id: 'card',
    title: 'La tua card',
    images: ['card'],
    body: <p>Dal tuo profilo, “Condividi la tua card” crea un’immagine con foto, posizione, numeri e badge, da mandare su WhatsApp o Instagram o da salvare. Condividerla è una tua scelta: l’app resta privata.</p>,
  },
  {
    id: 'andamento',
    title: 'L’andamento in classifica',
    images: ['andamento'],
    body: <p>Nel profilo, la tua posizione alla fine di ogni giornata. Tocca il grafico per vedere posizione e punti di quella giornata. Una partita di recupero conta nella settimana in cui la giochi.</p>,
  },
  {
    id: 'testa-a-testa',
    title: 'Il testa a testa',
    images: ['testa-a-testa', 'avversari-comuni'],
    body: (
      <p>
        Confronta due giocatori. Apri il profilo di un altro giocatore (dalla classifica: tocca il suo nome, poi “Apri profilo”): sotto i suoi numeri, nella parte scura in alto, c’è “Confronta con te”. Oppure, nel tuo profilo, tocca un nome nella lista “Scontri diretti”. Vedi lo scontro diretto, i numeri affiancati, l’andamento di tutti e due e i risultati contro gli avversari che avete affrontato entrambi.
      </p>
    ),
  },
  {
    id: 'foto',
    title: 'Foto e gallery',
    body: <p>Dopo una partita i due giocatori possono caricare una o più foto: la prima diventa la copertina della partita. Nella Gallery trovi tutte le foto del torneo che stai guardando. Nel profilo puoi mettere la tua foto toccando il tuo avatar.</p>,
  },
  {
    id: 'impostazioni',
    title: 'Le impostazioni',
    images: ['impostazioni'],
    body: (
      <p>
        Dall’ingranaggio in alto nel tuo profilo: installare l’app, cambiare la password, <a href="#torneo">scegliere il torneo</a>, aprire questa guida e uscire. Su computer torneo, guida ed esci sono anche nella barra a sinistra.
      </p>
    ),
  },
  {
    id: 'torneo',
    title: 'Scegliere il torneo',
    images: ['torneo-concluso'],
    body: (
      <>
        <p>
          Quando ci sono più tornei (per esempio quello in corso e quelli degli anni passati) scegli quale guardare dalla riga “Torneo” nelle <a href="#impostazioni">impostazioni</a> o, su computer, sotto il logo nella barra a sinistra. La scelta vale per tutta l’app: Home, calendario, classifica, pronostici, profilo, gallery e testa a testa.
        </p>
        <p>Guardando un torneo concluso, in cima alle pagine c’è un avviso con il link per tornare a quello in corso. Programmare, inserire risultati e caricare foto si fa sempre sul torneo in corso. Con un solo torneo la riga mostra solo il suo nome.</p>
        <p>Tra un torneo e l’altro, quando nessuno è in corso, l’app mostra l’ultimo concluso finché non parte il prossimo.</p>
      </>
    ),
  },
];

/** Sotto questa distanza dal bordo alto una sezione conta come "quella che stai leggendo" */
const READING_LINE = 120;

/**
 * Sezione attiva dell'indice. In fondo alla pagina vale sempre l'ultima, anche se è troppo corta
 * per arrivare in cima. Dopo un tocco sull'indice resta quella scelta finché non si scorre a mano:
 * altrimenti una sezione corta verso la fine verrebbe scavalcata dalla successiva.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]!);
  const chosen = useRef(false);

  const update = useCallback(() => {
    if (chosen.current) return;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) return setActive(ids[ids.length - 1]!);
    let current = ids[0]!;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= READING_LINE) current = id;
    }
    setActive(current);
  }, [ids]);

  useEffect(() => {
    update();
    // lo scorrimento a mano riporta l'evidenziazione a seguire la pagina
    const release = () => {
      chosen.current = false;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchmove', release, { passive: true });
    window.addEventListener('keydown', release);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('keydown', release);
    };
  }, [update]);

  const choose = useCallback((id: string) => {
    chosen.current = true;
    setActive(id);
  }, []);
  return [active, choose] as const;
}

const IDS = SECTIONS.map((s) => s.id);

export function GuidePage() {
  const location = useLocation();
  const [active, choose] = useActiveSection(IDS);
  const toc = useRef<HTMLElement>(null);

  const goTo = useCallback(
    (id: string, smooth = true) => {
      const el = document.getElementById(id);
      if (!el) return;
      choose(id);
      el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
      history.replaceState(null, '', `#${id}`);
    },
    [choose],
  );

  // aperta da un punto interrogativo: va alla sezione giusta
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => goTo(id, false), 50);
    return () => clearTimeout(t);
  }, [location.hash, goTo]);

  // sul telefono l'indice scorre di lato: la voce attiva resta in vista
  useEffect(() => {
    toc.current?.querySelector('a.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [active]);

  // link interni (indice e testo): scorrimento morbido e voce scelta evidenziata
  const onLink = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (!href?.startsWith('#')) return;
    e.preventDefault();
    goTo(href.slice(1));
  };

  return (
    <div className="screen guide" style={{ gap: 18 }} onClick={onLink}>
      <div className="page-head" style={{ gap: 8 }}>
        {/* la freccia fissa sta sotto l'indice, che resta in alto */}
        <BackButton floatTop={52} />
        <h1 className="display">Guida</h1>
        <div className="sub">Tutto quello che si può fare con TennIsLove. Il punto interrogativo accanto a ogni funzione porta qui, alla sua spiegazione.</div>
      </div>

      <div className="guide-layout">
        <nav ref={toc} className="guide-toc" aria-label="Indice">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : undefined} aria-current={active === s.id ? 'location' : undefined}>
              {s.title}
            </a>
          ))}
        </nav>

        <div className="guide-content">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="guide-section">
              <h2 className="title">{s.title}</h2>
              <div className="guide-body">{s.body}</div>
              {s.images && (
                <div className="guide-shots">
                  {s.images.map((img) => (
                    <img key={img} src={`/guida/${img}.jpg`} alt="" loading="lazy" width={SIZE[img]?.[0]} height={SIZE[img]?.[1]} />
                  ))}
                </div>
              )}
            </section>
          ))}

        </div>
      </div>
    </div>
  );
}
