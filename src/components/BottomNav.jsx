import { NavLink } from 'react-router-dom';

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  hunt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  ),
  raffle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="12" rx="1.5" />
      <path d="M3 11h18M9 7v12" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  ),
};

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'home' },
  { to: '/hunt', label: 'Hunt', icon: 'hunt' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/raffle', label: 'Raffle', icon: 'raffle' },
  { to: '/more', label: 'More', icon: 'more' },
];

export default function BottomNav() {
  return (
    <nav className="bottomnav">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          {ICONS[item.icon]}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
