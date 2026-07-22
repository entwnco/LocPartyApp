import { useAdminState } from '../../state/AdminState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';

export default function AdminOverview() {
  const { guests, content, completions, totalPoints, totalEntries } = useAdminState();

  const pendingCount = completions.filter((c) => c.status === 'pending').length;

  const byGroup = RELATIONSHIP_STATUSES.map((s) => ({
    ...s,
    count: guests.filter((g) => g.relationshipStatusId === s.id).length,
  }));

  return (
    <div className="stack">
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <StatCard label="Guests" value={guests.length} />
        <StatCard label="Total points awarded" value={totalPoints} />
        <StatCard label="Total raffle entries" value={totalEntries} />
        <StatCard label="Pending submissions" value={pendingCount} />
      </div>

      <h3>Anonymous relationship-status totals</h3>
      <p className="field-hint">Group totals only — never tied to an individual guest's name here.</p>
      <div className="stack">
        {byGroup.map((g) => (
          <div key={g.id} className="card flat row-between">
            <span>{g.label}</span>
            <strong>{g.count}</strong>
          </div>
        ))}
      </div>

      <h3>Challenge engagement</h3>
      <div className="stack">
        {content.challenges.map((c) => {
          const count = completions.filter((cp) => cp.challengeId === c.id && cp.status === 'approved').length;
          return (
            <div key={c.id} className="card flat row-between">
              <span>{c.title}</span>
              <strong>{count} completions</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card flat" style={{ flex: '1 1 140px', textAlign: 'center' }}>
      <div className="eyebrow">{label}</div>
      <h2 style={{ marginTop: 8 }}>{value}</h2>
    </div>
  );
}
