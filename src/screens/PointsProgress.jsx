import { useAppState } from '../state/AppState.jsx';
import BackHeader from './more/BackHeader.jsx';

export default function PointsProgress() {
  const { pointsTotal, pointsHistory } = useAppState();
  const nextMilestone = [50, 100, 200, 400].find((m) => m > pointsTotal) || null;

  return (
    <div className="screen">
      <div>
        <BackHeader eyebrow="Points & progress" title={`${pointsTotal} points`} />
        {nextMilestone && (
          <>
            <p>{nextMilestone - pointsTotal} points to your next unlock milestone.</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(100, (pointsTotal / nextMilestone) * 100)}%` }} />
            </div>
          </>
        )}
      </div>

      <h2>History</h2>
      {pointsHistory.length === 0 ? (
        <div className="empty-state">No points yet — go complete something!</div>
      ) : (
        <div className="stack">
          {pointsHistory.map((h) => (
            <div key={h.id} className="card flat row-between">
              <span>{h.label}</span>
              <strong style={{ color: h.amount < 0 ? 'var(--danger)' : 'var(--accent)' }}>
                {h.amount > 0 ? `+${h.amount}` : h.amount}
              </strong>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
