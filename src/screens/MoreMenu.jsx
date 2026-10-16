import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

const ITEMS = [
  { to: '/more/profile', title: 'My Profile', desc: 'Edit your details' },
  { to: '/venue', title: 'Venue', desc: 'Areas of the party' },
  { to: '/more/vendors', title: 'Vendors', desc: 'Featured & all vendors' },
  { to: '/more/progress', title: 'Points', desc: 'Your score and history' },
  { to: '/more/raffle', title: 'Raffle', desc: 'Entries and the drawing', raffle: true },
  { to: '/more/map', title: 'Event Map', desc: 'Find your way around' },
  { to: '/more/leaderboard', title: 'Leaderboard', desc: 'See how you stack up' },
  { to: '/more/prizes', title: 'Prizes', desc: 'What you could win', raffle: true },
];

export default function MoreMenu() {
  const { content } = useAppState();
  const items = ITEMS.filter((item) => !item.raffle || content.raffleEnabled);
  return (
    <div className="screen">
      <div>
        <span className="eyebrow">More</span>
        <h1>Everything else</h1>
      </div>
      <div className="menu-grid">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="menu-tile">
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
