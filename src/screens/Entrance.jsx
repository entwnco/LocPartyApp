import { useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { EVENT_INFO } from '../data/config.js';

export default function Entrance() {
  const { guest, ready, bootError } = useAppState();
  const navigate = useNavigate();

  return (
    <div className="screen entrance-screen">
      <div className="stack entrance-content">
        <div className="entrance-media">
          <img
            src="/logo-square.png"
            alt="The Loc Party"
            className="entrance-logo"
            decoding="async"
          />
          <img
            src="/graphics/welcome-wave-splatter.webp"
            alt="A Loc Party guest waving hello"
            className="entrance-welcome-art"
            decoding="async"
          />
        </div>

        <div className="entrance-copy">
          <span className="eyebrow">Welcome to</span>
          <h1 className="entrance-title">{EVENT_INFO.name}</h1>
          <p>{EVENT_INFO.tagline}</p>
        </div>

        <div className="entrance-cta">
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
              Let's Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
