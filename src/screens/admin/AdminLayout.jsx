import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAdminState } from '../../state/AdminState.jsx';

const TABS = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/challenges', label: 'Challenges' },
  { to: '/admin/vendors', label: 'Vendors' },
  { to: '/admin/schedule', label: 'Schedule' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/prizes', label: 'Prizes' },
  { to: '/admin/raffle', label: 'Raffle' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  const { session, authReady, signOut } = useAdminState();

  if (!authReady) return <div className="screen" style={{ minHeight: '100svh' }} />;
  if (!session) return <Navigate to="/admin" replace />;

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
          {TABS.map((t) => (
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
