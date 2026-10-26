import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useNavigationType, type Location } from 'react-router';
import { hideBoot, useFontsReady } from './boot';
import { InstallBanner, lockPageScroll, Splash, TabBar, useClosing, useDesktop } from './components/ui';
import { useMe, useSeason } from './data';
import { AdminPage } from './pages/Admin';
import { CalendarPage } from './pages/Calendar';
import { ConfirmPage } from './pages/Confirm';
import { GalleryPage } from './pages/Gallery';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { MatchPage } from './pages/Match';
import { ProfilePage } from './pages/Profile';
import { ResultPage } from './pages/Result';
import { SelfiePage } from './pages/Selfie';
import { StandingsPage } from './pages/Standings';
import { UpdateBanner, useResumeRoute } from './pwa';

/** Tutta l'app è privata (D-009) */
function RequireLogin({ admin = false }: { admin?: boolean }) {
  const me = useMe();
  // il torneo si chiede insieme al login, non dopo: alla prima pagina i dati ci sono già
  const season = useSeason();
  const location = useLocation();
  if (me.isLoading || (me.data && season.isLoading)) return <Splash />;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !me.data.isAdmin) return <Navigate to="/" replace />;
  // App e gestionale sono separati: un account solo amministratore vive nel gestionale
  if (!admin && !me.data.playerId) return <Navigate to={me.data.isAdmin ? '/admin' : '/login'} replace />;
  return (
    <FromSplash>
      <Outlet />
    </FromSplash>
  );
}

/** Pagina pronta: la schermata di avvio sfuma sopra di lei */
function FromSplash({ children }: { children: ReactNode }) {
  useEffect(hideBoot, []);
  return children;
}

function WithTabs() {
  return (
    <div className="app app-tabs">
      <Outlet />
      <div className="dock">
        <InstallBanner />
        <TabBar />
      </div>
    </div>
  );
}

function Plain() {
  return (
    <div className="app app-plain">
      <Outlet />
    </div>
  );
}

const isMatchPath = (path: string) => path.startsWith('/partite/');

/** Sfondo quando si arriva alla partita senza una pagina di provenienza (ricarica, link nelle email) */
const HOME: Location = { pathname: '/', search: '', hash: '', state: null, key: 'home' };

/**
 * Su desktop le pagine della partita (scheda, foto, risultato, conferma) si aprono in una finestra
 * sopra la pagina da cui si arriva, che resta montata sotto; senza pagina di provenienza (ricarica, email) sotto c'è la Home.
 * Sul telefono sono pagine intere.
 */
function useMatchModal() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const desktop = useDesktop();
  const background = useRef<Location | null>(null);
  const depth = useRef(0);
  const inMatch = isMatchPath(location.pathname);
  if (!inMatch) background.current = location;

  // quante pagine della partita sono state aperte sopra lo sfondo: chiudere torna indietro di tante
  useEffect(() => {
    if (!inMatch) depth.current = 0;
    else if (navigationType === 'PUSH') depth.current += 1;
    else if (navigationType === 'POP') depth.current = Math.max(0, depth.current - 1);
  }, [location.key, inMatch, navigationType]);

  return {
    background: desktop && inMatch ? (background.current ?? HOME) : null,
    depth,
  };
}

function MatchModal({ background, depth, children }: { background: Location; depth: { current: number }; children: ReactNode }) {
  const navigate = useNavigate();
  const [closing, close] = useClosing(() => (depth.current > 0 ? navigate(-depth.current) : navigate(background.pathname + background.search)));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.sheet-wrap') && close();
    window.addEventListener('keydown', onKey);
    const unlock = lockPageScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [close]);
  return (
    <div className={`modal-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={close} />
      {/* si chiude con la freccia indietro della pagina, con un clic fuori o con Esc */}
      <div className="modal route-modal">
        {/* lo scorrimento è in un contenitore interno: la barra resta dentro gli angoli arrotondati */}
        <div className="route-modal-scroll">{children}</div>
      </div>
    </div>
  );
}

export function App() {
  useResumeRoute();
  const { background, depth } = useMatchModal();
  // nessuna pagina, login compreso, compare prima dei font: altrimenti il testo cambia forma sotto gli occhi
  const fonts = useFontsReady();
  if (!fonts) return <Splash />;
  return (
    <>
      <UpdateBanner />
      <Routes location={background ?? undefined}>
        <Route element={<Plain />}>
          <Route
            path="/login"
            element={
              <FromSplash>
                <LoginPage />
              </FromSplash>
            }
          />
        </Route>
        <Route element={<RequireLogin />}>
          <Route element={<WithTabs />}>
            <Route index element={<HomePage />} />
            <Route path="/classifica" element={<StandingsPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/profilo" element={<ProfilePage />} />
            <Route path="/giocatori/:id" element={<ProfilePage />} />
          </Route>
          <Route element={<Plain />}>
            <Route path="/partite/:id" element={<MatchPage />} />
            <Route path="/partite/:id/risultato" element={<ResultPage />} />
            <Route path="/partite/:id/conferma" element={<ConfirmPage />} />
            <Route path="/partite/:id/foto" element={<SelfiePage />} />
          </Route>
        </Route>
        <Route element={<RequireLogin admin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {background && (
        <MatchModal background={background} depth={depth}>
          <Routes>
            <Route path="/partite/:id" element={<MatchPage />} />
            <Route path="/partite/:id/risultato" element={<ResultPage />} />
            <Route path="/partite/:id/conferma" element={<ConfirmPage />} />
            <Route path="/partite/:id/foto" element={<SelfiePage />} />
          </Routes>
        </MatchModal>
      )}
    </>
  );
}
