import { useState } from 'react';
import { useAppState } from '../../state/AppState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';
import BackHeader from './BackHeader.jsx';

export default function Profile() {
  const { guest, updateGuest, setRelationshipStatus, addProfilePhoto, content } = useAppState();
  const [displayName, setDisplayName] = useState(guest.displayName);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  async function handlePhoto(e, action) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setPhotoError('');
    try {
      await action(file);
    } catch (err) {
      console.error('Photo upload failed:', err);
      setPhotoError(err?.message || 'Upload failed — try a different photo or check your connection.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="screen">
      <BackHeader eyebrow="My profile" title="Edit details" />

      <div className="field">
        <label>Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => updateGuest({ displayName })}
        />
      </div>

      <div className="field">
        <label>Profile photo {!guest.photoDataUrl && `(+${content.pointValues.profilePhoto} pts)`}</label>
        <label className="upload-box" style={{ display: 'block' }}>
          {guest.photoDataUrl ? <img src={guest.photoDataUrl} alt="Profile" /> : <span>{busy ? 'Loading…' : 'Tap to upload'}</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => handlePhoto(e, addProfilePhoto)} />
        </label>
        {photoError && <p style={{ color: 'var(--danger, #e05353)' }}>{photoError}</p>}
      </div>

      <div className="field">
        <label>I'm here to…</label>
        <input
          type="text"
          value={guest.hereFor || ''}
          onChange={(e) => updateGuest({ hereFor: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Relationship status</label>
        <div className="choice-grid">
          {RELATIONSHIP_STATUSES.map((s) => (
            <button
              key={s.id}
              className={`choice ${guest.relationshipStatusId === s.id ? 'selected' : ''}`}
              onClick={() => setRelationshipStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="divider" />
      <div className="field">
        <label>Save to your home screen</label>
        <p className="field-hint">
          On iPhone, tap Share then "Add to Home Screen." On Android, tap the menu then "Add to Home Screen" or
          "Install app."
        </p>
      </div>
    </div>
  );
}
