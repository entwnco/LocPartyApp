import { useState } from 'react';
import { useAppState } from '../../state/AppState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';
import BackHeader from './BackHeader.jsx';

export default function Profile() {
  const { guest, updateGuest, setRelationshipStatus, addProfilePhoto, uploadLook, content } = useAppState();
  const [displayName, setDisplayName] = useState(guest.displayName);
  const [busy, setBusy] = useState(false);

  async function handlePhoto(e, action) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await action(file);
    } finally {
      setBusy(false);
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
      </div>

      <div className="field">
        <label>
          Loc Party look {!guest.lookPhotoDataUrl && `(+${content.pointValues.uploadLook} pts + a raffle entry)`}
        </label>
        <label className="upload-box" style={{ display: 'block' }}>
          {guest.lookPhotoDataUrl ? <img src={guest.lookPhotoDataUrl} alt="Look" /> : <span>{busy ? 'Loading…' : 'Tap to upload'}</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => handlePhoto(e, uploadLook)} />
        </label>
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
    </div>
  );
}
