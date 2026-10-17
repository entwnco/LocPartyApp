import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../state/AppState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';
import BackHeader from './BackHeader.jsx';
import InstallPrompt from '../../components/InstallPrompt.jsx';

function profileError(err) {
  const msg = err?.message || '';
  if (/duplicate key.*display_name|guests_display_name_unique/i.test(msg)) {
    return 'That name is taken — try another.';
  }
  return msg || 'Could not save those changes.';
}

export default function Profile() {
  const { guest, updateGuest, setRelationshipStatus, addProfilePhoto, content, signOutGuest, updatePassword } = useAppState();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(guest.displayName);
  const [hereFor, setHereFor] = useState(guest.hereFor || '');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [logoutError, setLogoutError] = useState('');

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

      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const name = displayName.trim();
          if (!name) {
            setSaveError('Display name can’t be empty.');
            return;
          }
          setSaving(true);
          setSaved(false);
          setSaveError('');
          try {
            await updateGuest({ displayName: name, hereFor: hereFor.trim() });
            setSaved(true);
          } catch (err) {
            console.error('Profile save failed:', err);
            setSaveError(profileError(err));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="field">
          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-here">I'm here to…</label>
          <input
            id="profile-here"
            type="text"
            value={hereFor}
            onChange={(e) => {
              setHereFor(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        {saveError && <p style={{ color: 'var(--danger, #e05353)' }}>{saveError}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving || !displayName.trim()}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save profile'}
        </button>
      </form>

      <div className="field">
        <label>Profile photo {!guest.photoDataUrl && `(+${content.pointValues.profilePhoto} pts)`}</label>
        <label className="upload-box" style={{ display: 'block' }}>
          {guest.photoDataUrl ? <img src={guest.photoDataUrl} alt="Profile" /> : <span>{busy ? 'Loading…' : 'Tap to upload'}</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => handlePhoto(e, addProfilePhoto)} />
        </label>
        {photoError && <p style={{ color: 'var(--danger, #e05353)' }}>{photoError}</p>}
      </div>

      <div className="field">
        <label>Relationship status</label>
        <div className="choice-grid">
          {RELATIONSHIP_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`choice ${guest.relationshipStatusId === s.id ? 'selected' : ''}`}
              onClick={async () => {
                setStatusError('');
                try {
                  await setRelationshipStatus(s.id);
                } catch (err) {
                  console.error('Relationship status failed:', err);
                  setStatusError(err?.message || 'Could not save that status.');
                }
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        {statusError && <p style={{ color: 'var(--danger, #e05353)' }}>{statusError}</p>}
      </div>

      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setPasswordError('');
          setPasswordMessage('');
          if (password.length < 6) {
            setPasswordError('Use at least 6 characters.');
            return;
          }
          if (password !== confirmPassword) {
            setPasswordError('Those passwords don’t match.');
            return;
          }
          setPasswordBusy(true);
          try {
            await updatePassword(password);
            setPassword('');
            setConfirmPassword('');
            setPasswordMessage('Password updated.');
          } catch (err) {
            console.error('Password update failed:', err);
            setPasswordError(err?.message || 'Could not update that password.');
          } finally {
            setPasswordBusy(false);
          }
        }}
      >
        <div className="field">
          <label htmlFor="profile-password">New password</label>
          <input
            id="profile-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-password-confirm">Confirm password</label>
          <input
            id="profile-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {passwordError && <p style={{ color: 'var(--danger, #e05353)' }}>{passwordError}</p>}
        {passwordMessage && <p className="field-hint">{passwordMessage}</p>}
        <button type="submit" className="btn btn-secondary" disabled={passwordBusy || password.length < 6 || !confirmPassword}>
          {passwordBusy ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <hr className="divider" />
      <InstallPrompt />

      <button
        type="button"
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
        onClick={async () => {
          if (!window.confirm('Log out of this phone?')) return;
          setLogoutError('');
          try {
            await signOutGuest();
            navigate('/');
          } catch (err) {
            console.error('Log out failed:', err);
            setLogoutError(err?.message || 'Could not log out.');
          }
        }}
      >
        Log out
      </button>
      {logoutError && <p style={{ color: 'var(--danger, #e05353)' }}>{logoutError}</p>}
    </div>
  );
}
