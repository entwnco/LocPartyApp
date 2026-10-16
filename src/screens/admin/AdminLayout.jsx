import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAdminState } from '../../state/AdminState.jsx';

const TABS = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/guests', label: 'Guests' },
  { to: '/admin/bingo', label: 'Bingo' },
  { to: '/admin/challenges', label: 'Challenges' },
  { to: '/admin/vendors', label: 'Vendors' },
  { to: '/admin/schedule', label: 'Schedule' },
  { to: '/admin/venue', label: 'Venue' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/raffle', label: 'Draw' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  const { session, isAdmin, authReady, signOut, content } = useAdminState();
  const tabs = TABS.filter((tab) => !tab.raffle || content.raffleEnabled);

  if (!authReady || (session && !isAdmin)) return <div className="screen" style={{ minHeight: '100svh' }} />;
  if (!session || !isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div className="topbar">
        <span className="brand">
          Admin <em>Console</em>
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            await signOut();
            window.location.href = '/admin';
          }}
        >
          Log out
        </button>
      </div>
      <div className="admin-shell" style={{ padding: '14px 16px 60px' }}>
        <div className="scroll-x row" style={{ gap: 8, marginBottom: 16, paddingBottom: 6 }}>
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
