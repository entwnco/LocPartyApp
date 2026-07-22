import { useAppState } from '../state/AppState.jsx';
import ChallengeCard from '../components/ChallengeCard.jsx';

export default function ScavengerHunt() {
  const { guest, visibleChallenges, completions } = useAppState();
  const sorted = [...visibleChallenges].sort((a, b) => Number(!a.status.unlocked) - Number(!b.status.unlocked));

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Scavenger hunt</span>
        <h1>Your map through the Loc Party</h1>
        <p>
          Complete challenges, visit vendors, and catch hidden moments to earn points and raffle entries. Tap any
          card below to jump in — new ones unlock as the night goes on.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">Nothing here yet. The hunt will open up soon.</div>
      ) : (
        <div className="stack">
          {sorted.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              completionStatus={completions.find((cp) => cp.guestId === guest.id && cp.challengeId === c.id)?.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
