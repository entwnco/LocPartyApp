import { Link } from 'react-router-dom';

const ITEMS = [
  { to: '/more/profile', title: 'My Profile', desc: 'Edit your details' },
  { to: '/more/schedule', title: 'Schedule', desc: "What's happening when" },
  { to: '/more/map', title: 'Event Map', desc: 'Find your way around' },
  { to: '/more/vendors', title: 'Vendors', desc: 'Featured & all vendors' },
  { to: '/more/announcements', title: 'Announcements', desc: 'Live updates' },
  { to: '/more/surprises', title: 'Unlocked Surprises', desc: 'Revealed just for you' },
  { to: '/more/leaderboard', title: 'Leaderboard', desc: 'See how you stack up' },
  { to: '/more/prizes', title: 'Prizes', desc: 'What you could win' },
];

export default function MoreMenu() {
  return (
    <div className="screen">
      <div>
        <span className="eyebrow">More</span>
        <h1>Everything else</h1>
      </div>
      <div className="menu-grid">
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="menu-tile">
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
