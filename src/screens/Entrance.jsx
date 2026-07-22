import { useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { EVENT_INFO } from '../data/config.js';

export default function Entrance() {
  const { guest, ready, bootError } = useAppState();
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: '100svh' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 18 }}>
        <img
          src="/logo-square.png"
          alt="The Loc Party"
          style={{ width: 150, height: 150, borderRadius: 18, boxShadow: 'var(--shadow-pop)' }}
        />
        <span className="eyebrow">Welcome to</span>
        <h1 style={{ fontSize: '2.4rem' }}>{EVENT_INFO.name}</h1>
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
