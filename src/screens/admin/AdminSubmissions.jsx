import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

export default function AdminSubmissions() {
  const { completions, content, guests, reviewCompletion } = useAdminState();
  const [busyId, setBusyId] = useState(null);
  const pending = completions.filter((c) => c.status === 'pending');
  const reviewed = completions.filter((c) => c.status !== 'pending');

  function challengeFor(c) {
    return content.challenges.find((ch) => ch.id === c.challengeId);
  }

  function guestFor(c) {
    return guests.find((g) => g.id === c.guestId);
  }

  async function handleReview(id, approve) {
    setBusyId(id);
    try {
      await reviewCompletion(id, approve);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <h2>Submissions</h2>

      <h3>Pending ({pending.length})</h3>
      {pending.length === 0 ? (
        <div className="empty-state">Nothing waiting on review.</div>
      ) : (
        <div className="stack">
          {pending.map((c) => {
            const challenge = challengeFor(c);
            const guest = guestFor(c);
            return (
              <div key={c.id} className="card">
                <h3>{challenge?.title || c.challengeId}</h3>
                <p className="field-hint">Guest: {guest?.displayName || c.guestId}</p>
                <SubmissionPreview completion={c} />
                <div className="row" style={{ gap: 10, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => handleReview(c.id, true)}>Approve</button>
                  <button className="btn btn-danger btn-sm" disabled={busyId === c.id} onClick={() => handleReview(c.id, false)}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3>Reviewed</h3>
      {reviewed.length === 0 ? (
        <div className="empty-state">No reviewed submissions yet.</div>
      ) : (
        <div className="stack">
          {reviewed.map((c) => (
            <div key={c.id} className="card flat row-between">
              <span>{challengeFor(c)?.title || c.challengeId}</span>
              <span className={`pill-status ${c.status === 'approved' ? 'on' : 'off'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionPreview({ completion }) {
  const { proofType, proofPayload } = completion;
  if (proofType === 'photo_upload' && proofPayload?.data) {
    return <img src={proofPayload.data} alt="Submission" style={{ maxWidth: '100%', borderRadius: 8 }} />;
  }
  if (proofType === 'video_upload') {
    return <p className="field-hint">Video submitted (stored as a data URL on submission).</p>;
  }
  if (proofType === 'short_answer') {
    return <p>"{proofPayload?.value}"</p>;
  }
  return <p className="field-hint">Proof type: {proofType}</p>;
}
