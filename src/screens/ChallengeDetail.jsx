import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { fileToResizedDataUrl } from '../lib/image.js';

export default function ChallengeDetail() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { guest, visibleChallenges, completions, completeChallenge, content } = useAppState();
  const challenge = visibleChallenges.find((c) => c.id === challengeId);
  const [answer, setAnswer] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!challenge) {
    return (
      <div className="screen">
        <div className="empty-state">This challenge isn't available right now.</div>
        <button className="btn btn-secondary" onClick={() => navigate('/hunt')}>
          Back to hunt
        </button>
      </div>
    );
  }

  const existing = completions.find((cp) => cp.guestId === guest.id && cp.challengeId === challenge.id);
  const vendor = challenge.vendorId ? content.vendors.find((v) => v.id === challenge.vendorId) : null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setFileDataUrl(await fileToResizedDataUrl(file));
    } finally {
      setBusy(false);
    }
  }

  function submit(payload) {
    completeChallenge(challenge, payload);
    navigate('/hunt');
  }

  return (
    <div className="screen">
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/hunt')}>
        ← Back to hunt
      </button>
      <span className="tag">{challenge.category}</span>
      <h1>{challenge.title}</h1>
      <p>{challenge.description}</p>
      {vendor && <p className="field-hint">Connected to: {vendor.name}</p>}
      <p className="field-hint">
        Reward: +{challenge.pointValue} points{challenge.entryValue ? ` · +${challenge.entryValue} raffle entries` : ''}
      </p>

      {existing?.status === 'approved' && <div className="banner-demo">Completed — nice work!</div>}
      {existing?.status === 'pending' && <div className="banner-demo">Submitted, waiting on review.</div>}
      {existing?.status === 'rejected' && <div className="banner-demo">Not approved — you can try again below.</div>}

      {(!existing || existing.status === 'rejected') && (
        <>
          {challenge.proofType === 'check_in' && (
            <button className="btn btn-primary btn-block" onClick={() => submit({ type: 'check_in' })}>
              Check in
            </button>
          )}

          {challenge.proofType === 'qr_scan' && (
            <div className="stack">
              <p className="field-hint">Demo mode: tap below instead of scanning a physical code.</p>
              <button className="btn btn-primary btn-block" onClick={() => submit({ type: 'qr_scan', demo: true })}>
                Simulate QR scan
              </button>
            </div>
          )}

          {challenge.proofType === 'secret_code' && (
            <div className="stack">
              <div className="field">
                <label>Secret code</label>
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Enter code" />
              </div>
              <button className="btn btn-primary btn-block" disabled={!answer.trim()} onClick={() => submit({ type: 'secret_code', value: answer })}>
                Submit code
              </button>
            </div>
          )}

          {challenge.proofType === 'multiple_choice' && (
            <div className="stack">
              {(challenge.choices || ['Option A', 'Option B', 'Option C']).map((opt) => (
                <button key={opt} className="choice" onClick={() => submit({ type: 'multiple_choice', value: opt })}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {challenge.proofType === 'short_answer' && (
            <div className="stack">
              <div className="field">
                <label>Your answer</label>
                <textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={!answer.trim()} onClick={() => submit({ type: 'short_answer', value: answer })}>
                Submit for review
              </button>
            </div>
          )}

          {(challenge.proofType === 'photo_upload' || challenge.proofType === 'video_upload') && (
            <div className="stack">
              <label className="upload-box" style={{ display: 'block' }}>
                {fileDataUrl ? (
                  challenge.proofType === 'photo_upload' ? (
                    <img src={fileDataUrl} alt="Your submission" />
                  ) : (
                    <span>Video attached ✓</span>
                  )
                ) : (
                  <span>{busy ? 'Loading…' : `Tap to upload a ${challenge.proofType === 'photo_upload' ? 'photo' : 'video'}`}</span>
                )}
                <input type="file" accept={challenge.proofType === 'photo_upload' ? 'image/*' : 'video/*'} hidden onChange={handleFile} />
              </label>
              <button className="btn btn-primary btn-block" disabled={!fileDataUrl} onClick={() => submit({ type: challenge.proofType, data: fileDataUrl })}>
                Submit for review
              </button>
            </div>
          )}

          {challenge.proofType === 'admin_approval' && (
            <button className="btn btn-primary btn-block" onClick={() => submit({ type: 'admin_approval' })}>
              Request approval
            </button>
          )}
        </>
      )}
    </div>
  );
}
