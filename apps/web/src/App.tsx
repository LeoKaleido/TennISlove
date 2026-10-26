import { useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { hideBoot, useFontsReady } from './boot';
import { InstallBanner, Splash, TabBar } from './components/ui';
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
    <div className="app">
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
    <div className="app">
      <Outlet />
    </div>
  );
}

export function App() {
  useResumeRoute();
  // nessuna pagina, login compreso, compare prima dei font: altrimenti il testo cambia forma sotto gli occhi
  const fonts = useFontsReady();
  if (!fonts) return <Splash />;
  return (
    <>
      <UpdateBanner />
      <Routes>
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
    </>
  );
}
