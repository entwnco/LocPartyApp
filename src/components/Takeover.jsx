import { useEffect } from 'react';
import { useAppState } from '../state/AppState.jsx';

// A real full-screen interrupt — not a passive banner on one tab. Fires when
// an admin posts a priority announcement or announces the raffle winner, and
// shows up regardless of which screen the guest is currently on. Auto-clears
// after a while so nobody gets stuck behind it if they don't tap.
export default function Takeover() {
  const { takeover, dismissTakeover } = useAppState();

  useEffect(() => {
    if (!takeover) return undefined;
    const t = setTimeout(dismissTakeover, 12000);
    return () => clearTimeout(t);
  }, [takeover, dismissTakeover]);

  if (!takeover) return null;

  return (
    <div className="takeover-overlay" onClick={dismissTakeover} role="alertdialog" aria-live="assertive">
      <div className="takeover-content" onClick={(e) => e.stopPropagation()}>
        <span className="takeover-kicker">{takeover.kicker}</span>
        <h1 className="takeover-title">{takeover.title}</h1>
        {takeover.body && <p className="takeover-body">{takeover.body}</p>}
        <button className="btn btn-primary btn-block" onClick={dismissTakeover}>
          Got it!
        </button>
      </div>
    </div>
  );
}
