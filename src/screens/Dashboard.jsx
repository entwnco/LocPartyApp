import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import AnnouncementAlerts from '../components/AnnouncementAlerts.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';
import { useUnseenAnnouncement } from '../lib/seenAnnouncements.js';

export default function Dashboard() {
  const { guest, pointsTotal, entryCount, bingoBoard, content } = useAppState();
  const bingoDone = bingoBoard.filter((s) => s.completed).length;
  const unseenAnnouncement = useUnseenAnnouncement();

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Welcome</span>
        <h1>Hey, {guest.displayName} 👋🏾</h1>
        <p>You're locked in and the party is LIVE! Here's where things stand.</p>
      </div>

      <InstallPrompt />
      <AnnouncementAlerts />

      <div className="row" style={{ gap: 10 }}>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Points</div>
          <h2 style={{ marginTop: 8 }}>{pointsTotal}</h2>
        </div>
        {content.raffleEnabled ? (
          <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
            <div className="eyebrow">Raffle entries</div>
            <h2 style={{ marginTop: 8 }}>{entryCount}</h2>
          </div>
        ) : null}
      </div>

      <div className="row-between">
        <h2 style={{ margin: 0 }}>Bingo</h2>
        <Link to="/bingo" className="btn-ghost btn">
          Open board
        </Link>
      </div>
      <Link to="/bingo" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="eyebrow">25 squares</span>
        <h3 style={{ marginTop: 8 }}>{bingoDone} completed</h3>
      </Link>

      <div className="menu-grid">
        <Link to="/venue" className="menu-tile">
          <strong>Venue</strong>
          <span>Areas of the party</span>
        </Link>
        <Link to="/more/vendors" className="menu-tile">
          <strong>Vendors</strong>
          <span>Explore featured vendors</span>
        </Link>
        <Link to="/schedule" className="menu-tile">
          <strong>Schedule</strong>
          <span>What's happening when</span>
        </Link>
        <Link to="/announcements" className={unseenAnnouncement ? 'menu-tile menu-tile-unseen' : 'menu-tile'}>
          <strong>Announcements</strong>
          <span>{unseenAnnouncement ? 'New update' : 'See the latest updates'}</span>
        </Link>
      </div>
    </div>
  );
}
