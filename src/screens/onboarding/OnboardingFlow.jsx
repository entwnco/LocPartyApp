import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../state/AppState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';

const STEP_COUNT = 4;

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const { createGuest, addProfilePhoto, setRelationshipStatus, pointsTotal, content } = useAppState();
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleNameSubmit() {
    if (!displayName.trim()) return;
    setBusy(true);
    try {
      await createGuest({ displayName: displayName.trim() });
      next();
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotoSubmit(skip) {
    if (skip || !photoFile) {
      next();
      return;
    }
    setBusy(true);
    try {
      await addProfilePhoto(photoFile);
      next();
    } finally {
      setBusy(false);
    }
  }

  async function handleRelationshipSubmit(statusId) {
    setBusy(true);
    try {
      await setRelationshipStatus(statusId);
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  }

  const photoPoints = content.pointValues.profilePhoto;
  const relationshipPoints = content.pointValues.selectRelationshipStatus;

  return (
    <div className="screen" style={{ minHeight: '100svh' }}>
      <div className="step-dots" style={{ marginBottom: 6 }}>
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <span key={i} className={i <= step ? 'active' : ''} />
        ))}
      </div>

      {step === 0 && (
        <div className="stack">
          <span className="eyebrow">Step 1 of 4</span>
          <h2>What should we call you?</h2>
          <p>This shows up on your profile and the leaderboard.</p>
          <div className="field">
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Nia"
              autoFocus
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={!displayName.trim() || busy} onClick={handleNameSubmit}>
            {busy ? 'Just a sec…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <span className="eyebrow">Step 2 of 4</span>
          <h1 className="onboarding-hero-title">How to Play</h1>
          <p>
            You just scored <strong>{pointsTotal} points</strong> for showing up — and that's just the start. All
            night long, easy little moves stack up points and unlock surprises.
          </p>
          <p>
            Your scavenger hunt is your map through the Loc Party: vendors to visit, challenges to complete, hidden
            moments to catch. Points build your status on the leaderboard. Raffle entries build your shot at real
            prizes. Go chase both.
          </p>
          <p>Next: drop a photo and your relationship status for even more points.</p>
          <button className="btn btn-primary btn-block" onClick={next}>
            Let's do this!
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <span className="eyebrow">Step 3 of 4</span>
          <h2>Add a profile photo</h2>
          <p>+{photoPoints} points for adding one — helps people recognize you around the party too.</p>
          <label className="upload-box" style={{ display: 'block' }}>
            {photoPreview ? <img src={photoPreview} alt="Your profile" /> : <span>Tap to choose a photo</span>}
            <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
          </label>
          <button
            className="btn btn-primary btn-block"
            disabled={!photoFile || busy}
            onClick={() => handlePhotoSubmit(false)}
          >
            {busy ? 'Uploading…' : 'Continue — claim points'}
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => handlePhotoSubmit(true)}>
            Skip for now
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <span className="eyebrow">Step 4 of 4</span>
          <h2>Relationship status</h2>
          <p>
            +{relationshipPoints} points for this one. It also changes your app's accent color tonight — and quietly
            places you in a group for something later. We'll only ever share anonymous totals, never your individual
            answer.
          </p>
          <div className="choice-grid">
            {RELATIONSHIP_STATUSES.map((s) => (
              <button key={s.id} className="choice" disabled={busy} onClick={() => handleRelationshipSubmit(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Relationship responses may be used anonymously for event insights (e.g. group totals). No individual
            response is ever shown publicly.
          </p>
          <img
            src="/graphics/relationship-status-couple.webp"
            alt="Two Loc Party guests surrounded by colorful paint splatter"
            className="relationship-status-art"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {step > 0 && step < 3 && (
        <button className="btn btn-ghost" onClick={back} style={{ alignSelf: 'flex-start' }}>
          ← Back
        </button>
      )}
    </div>
  );
}
