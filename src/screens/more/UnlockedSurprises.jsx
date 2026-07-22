import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

export default function UnlockedSurprises() {
  const { visibleChallenges, completedChallengeIds } = useAppState();
  const surprises = visibleChallenges.filter(
    (c) => (c.unlock?.type === 'hidden' || c.unlock?.type === 'relationship_group') && c.status.unlocked
  );

  return (
    <div className="screen">
      <BackHeader eyebrow="Unlocked surprises" title="Just for you" />
      {surprises.length === 0 ? (
        <div className="empty-state">Nothing's unlocked yet — keep playing, surprises are triggered as the party goes on.</div>
      ) : (
        <div className="stack">
          {surprises.map((c) => (
            <div key={c.id} className="card">
              <span className="tag">Surprise</span>
              <h3 style={{ marginTop: 8 }}>{c.title}</h3>
              <p>{c.description}</p>
              {completedChallengeIds.includes(c.id) && <span className="tag">Done ✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
