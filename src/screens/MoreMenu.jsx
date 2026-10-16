import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { useUnseenAnnouncement } from '../lib/seenAnnouncements.js';

const ITEMS = [
  { to: '/more/profile', title: 'My Profile', desc: 'Edit your details' },
  { to: '/announcements', title: 'Announcements', desc: 'See updates again', announce: true },
  { to: '/more/vendors', title: 'Vendors', desc: 'Featured & all vendors' },
  { to: '/more/progress', title: 'Points', desc: 'Your score and history' },
  { to: '/more/raffle', title: 'Raffle', desc: 'Entries and the drawing', raffle: true },
  { to: '/more/map', title: 'Event Map', desc: 'Find your way around', map: true },
  { to: '/more/leaderboard', title: 'Leaderboard', desc: 'See how you stack up' },
];

export default function MoreMenu() {
  const { content } = useAppState();
  const unseen = useUnseenAnnouncement();
  const items = ITEMS.filter((item) => (!item.raffle || content.raffleEnabled) && (!item.map || content.mapEnabled));
  return (
    <div className="screen">
      <div>
        <span className="eyebrow">More</span>
        <h1>Everything else</h1>
      </div>
      <div className="menu-grid">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={item.announce && unseen ? 'menu-tile menu-tile-unseen' : 'menu-tile'}>
            <strong>{item.title}</strong>
            <span>{item.announce && unseen ? 'New update' : item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
