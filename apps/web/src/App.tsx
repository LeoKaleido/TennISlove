import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Loading, TabBar } from './components/ui';
import { useMe } from './data';
import { AdminPage } from './pages/Admin';
import { CalendarPage } from './pages/Calendar';
import { ConfirmPage } from './pages/Confirm';
import { GalleryPage } from './pages/Gallery';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { MatchPage } from './pages/Match';
import { ProfilePage } from './pages/Profile';
import { ResultPage } from './pages/Result';
import { StandingsPage } from './pages/Standings';
import { VerifyPage } from './pages/Verify';

/** Tutta l'app è privata (D-009) */
function RequireLogin({ admin = false }: { admin?: boolean }) {
  const me = useMe();
  const location = useLocation();
  if (me.isLoading) return <Loading />;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !me.data.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function WithTabs() {
  return (
    <div className="app">
      <Outlet />
      <TabBar />
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
  return (
    <Routes>
      <Route element={<Plain />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<VerifyPage />} />
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
        </Route>
      </Route>
      <Route element={<RequireLogin admin />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
