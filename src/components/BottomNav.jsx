import { NavLink } from 'react-router-dom';
import { useUnseenAnnouncement } from '../lib/seenAnnouncements.js';

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  bingo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  venue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" />
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
  { to: '/dashboard', label: 'Home', icon: 'home', end: true },
  { to: '/schedule', label: 'Schedule', icon: 'schedule', end: true },
  { to: '/venue', label: 'Venue', icon: 'venue', end: true },
  { to: '/bingo', label: 'Bingo', icon: 'bingo' },
  { to: '/more', label: 'More', icon: 'more' },
];

export default function BottomNav() {
  const unseen = useUnseenAnnouncement();
  return (
    <nav className="bottomnav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          aria-label={item.to === '/more' && unseen ? 'More, new announcement' : undefined}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span className="nav-icon">
            {ICONS[item.icon]}
            {item.to === '/more' && unseen ? <span className="nav-dot" /> : null}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
