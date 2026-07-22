import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

export default function Leaderboard() {
  const { guest, pointsTotal } = useAppState();

  return (
    <div className="screen">
      <BackHeader eyebrow="Leaderboard" title="Optional & toggleable" />
      <div className="banner-demo">
        Demo note: this device only knows about your own guest profile, so the leaderboard shows just you. A shared
        backend is needed to rank all guests together.
      </div>
      <div className="card">
        <div className="row-between">
          <span>1. {guest.displayName}</span>
          <strong style={{ color: 'var(--accent)' }}>{pointsTotal} pts</strong>
        </div>
      </div>
      <p className="field-hint">Admins can hide the leaderboard entirely from Settings if it's not wanted for this event.</p>
    </div>
  );
}
