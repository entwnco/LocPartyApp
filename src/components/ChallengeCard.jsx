import { Link } from 'react-router-dom';

const PROOF_LABELS = {
  qr_scan: 'Scan a QR code',
  photo_upload: 'Upload a photo',
  video_upload: 'Upload a video',
  multiple_choice: 'Answer a question',
  short_answer: 'Write an answer',
  secret_code: 'Enter a secret code',
  admin_approval: 'Needs approval',
  check_in: 'Check in',
};

export default function ChallengeCard({ challenge, completionStatus }) {
  const locked = !challenge.status?.unlocked;
  const body = (
    <div className={`card ${locked ? 'locked' : ''}`}>
      <div className="row-between">
        <span className="tag">{challenge.category}</span>
        {completionStatus === 'approved' && <span className="tag">Done ✓</span>}
        {completionStatus === 'pending' && <span className="tag locked">In review</span>}
      </div>
      <h3 style={{ marginTop: 10 }}>{challenge.title}</h3>
      {!locked ? (
        <p>{challenge.description}</p>
      ) : (
        <p>{challenge.status?.reason || 'Locked for now — keep playing to unlock it.'}</p>
      )}
      <div className="row-between">
        <span className="field-hint">{PROOF_LABELS[challenge.proofType] || 'Complete to earn'}</span>
        <span className="field-hint">
          +{challenge.pointValue} pts{challenge.entryValue ? ` · +${challenge.entryValue} entries` : ''}
        </span>
      </div>
    </div>
  );

  if (locked) return body;
  return <Link to={`/hunt/${challenge.id}`} style={{ textDecoration: 'none' }}>{body}</Link>;
}
