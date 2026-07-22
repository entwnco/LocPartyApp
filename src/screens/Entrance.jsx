import { useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { EVENT_INFO } from '../data/config.js';

export default function Entrance() {
  const { guest, ready, bootError } = useAppState();
  const navigate = useNavigate();

  return (
    <div className="screen entrance-screen">
      <div className="stack entrance-content">
        <img
          src="/logo-square.png"
          alt="The Loc Party"
          className="entrance-logo"
        />
        <img
          src="/graphics/welcome-wave.png"
          alt="A Loc Party guest waving hello"
          className="entrance-welcome-art"
        />
        <span className="eyebrow">Welcome to</span>
        <h1 className="entrance-title">{EVENT_INFO.name}</h1>
        <p style={{ maxWidth: 320 }}>{EVENT_INFO.tagline}</p>

        {!ready ? (
          <p className="field-hint">Loading…</p>
        ) : bootError ? (
          <>
            <p style={{ color: 'var(--danger, #e05353)' }}>
              Couldn't connect: {bootError}
            </p>
            <button className="btn btn-secondary btn-block" onClick={() => window.location.reload()}>
              Try again
            </button>
          </>
        ) : guest ? (
          <>
            <p>Welcome back, {guest.displayName}.</p>
            <button className="btn btn-primary btn-block" onClick={() => navigate('/dashboard')}>
              Back to the party
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-block" onClick={() => navigate('/onboarding')}>
            Let's Go
          </button>
        )}

        <p className="field-hint" style={{ maxWidth: 300 }}>
          Save this to your home screen: on iPhone, tap Share then "Add to Home Screen." On Android, tap the menu
          then "Add to Home Screen" or "Install app."
        </p>
      </div>
    </div>
  );
}
