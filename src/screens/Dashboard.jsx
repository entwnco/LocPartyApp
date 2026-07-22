import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import ChallengeCard from '../components/ChallengeCard.jsx';

export default function Dashboard() {
  const { guest, pointsTotal, entryCount, visibleChallenges, content, completions } = useAppState();
  const unlockedNow = visibleChallenges.filter((c) => c.status.unlocked && !c.status.hidden).slice(0, 2);
  const activeAnnouncement = content.announcements.find((a) => a.active);

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Welcome</span>
        <h1>Hey, {guest.displayName} 👋</h1>
        <p>You're checked in and the party's live. Here's where things stand.</p>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Points</div>
          <h2 style={{ marginTop: 8 }}>{pointsTotal}</h2>
        </div>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Raffle entries</div>
          <h2 style={{ marginTop: 8 }}>{entryCount}</h2>
        </div>
      </div>

      {activeAnnouncement && (
        <div className="card">
          <span className="tag">Announcement</span>
          <h3 style={{ marginTop: 10 }}>{activeAnnouncement.title}</h3>
          <p>{activeAnnouncement.body}</p>
        </div>
      )}

      <div className="row-between">
        <h2 style={{ margin: 0 }}>Up next for you</h2>
        <Link to="/hunt" className="btn-ghost btn">
          See all
        </Link>
      </div>

      {unlockedNow.length === 0 ? (
        <div className="empty-state">More challenges unlock as the night goes on. Check back soon.</div>
      ) : (
        <div className="stack">
          {unlockedNow.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              completionStatus={completions.find((cp) => cp.guestId === guest.id && cp.challengeId === c.id)?.status}
            />
          ))}
        </div>
      )}

      <div className="menu-grid">
        <Link to="/more/vendors" className="menu-tile">
          <strong>Vendors</strong>
          <span>Explore featured vendors</span>
        </Link>
        <Link to="/more/schedule" className="menu-tile">
          <strong>Schedule</strong>
          <span>What's happening when</span>
        </Link>
      </div>
    </div>
  );
}
