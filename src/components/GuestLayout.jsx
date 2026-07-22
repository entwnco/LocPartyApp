import { Navigate, Outlet } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import TopBar from './TopBar.jsx';
import BottomNav from './BottomNav.jsx';
import Celebration from './Celebration.jsx';

export default function GuestLayout() {
  const { guest, ready } = useAppState();
  if (!ready) return <div className="screen" style={{ minHeight: '100svh' }} />;
  if (!guest) return <Navigate to="/" replace />;

  return (
    <div data-theme={guest.relationshipTheme || undefined} style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <TopBar />
      <Outlet />
      <BottomNav />
      <Celebration />
    </div>
  );
}
