import { useAppState } from '../state/AppState.jsx';

export default function PointsProgress() {
  const { pointsTotal, pointsHistory, content } = useAppState();
  const nextMilestone = [50, 100, 200, 400].find((m) => m > pointsTotal) || null;

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Points & progress</span>
        <h1>{pointsTotal} points</h1>
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
              <strong style={{ color: 'var(--accent)' }}>+{h.amount}</strong>
            </div>
          ))}
        </div>
      )}

      {content.raffleConfig && (
        <p className="field-hint">
          Points and raffle entries are tracked separately — points unlock content, entries are your raffle odds.
        </p>
      )}
    </div>
  );
}
