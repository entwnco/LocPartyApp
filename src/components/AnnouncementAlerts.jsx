import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppState.jsx';
import { alertSupport, enableAlerts, syncAlerts } from '../lib/push.js';

const DISMISS_KEY = 'locparty-push-dismissed';

function alertErrorMessage(err) {
  const message = err?.message || '';
  if (/push service not available/i.test(message)) {
    return 'This browser can’t deliver phone alerts. Turn them on from the installed app, or from Chrome on your phone.';
  }
  return message || 'Alerts could not be saved for this phone.';
}

export default function AnnouncementAlerts({ allowDismiss = true }) {
  const { guest } = useAppState();
  const support = alertSupport();
  const [permission, setPermission] = useState(support.permission);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (permission !== 'granted' || !guest?.id || support.needsInstall) return undefined;
    let cancelled = false;
    syncAlerts()
      .then(() => { if (!cancelled) setError(''); })
      .catch((err) => { if (!cancelled) setError(alertErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [permission, guest?.id, support.needsInstall]);

  if (!support.supported) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (support.needsInstall) {
    if (allowDismiss && dismissed) return null;
    return (
      <div className="card flat">
        <h3>Announcement alerts</h3>
        <p className="field-hint">Add Loc Party to your Home Screen, then open it from that icon to get announcements when the app is closed.</p>
        {allowDismiss ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>Not now</button>
        ) : null}
      </div>
    );
  }

  if (permission === 'granted') {
    if (error) {
      return (
        <div className="card flat">
          <h3>Announcement alerts</h3>
          <p className="field-hint">{error}</p>
        </div>
      );
    }
    if (allowDismiss) return null;
    return <p className="field-hint">Announcement alerts are on for this phone.</p>;
  }

  if (permission === 'denied') {
    return <p className="field-hint">Announcement alerts are blocked for this app in the browser settings.</p>;
  }

  if (allowDismiss && dismissed) return null;

  async function turnOn() {
    setBusy(true);
    setError('');
    try {
      setPermission(await enableAlerts());
    } catch (err) {
      setError(alertErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flat">
      <h3>Announcement alerts</h3>
      <p className="field-hint">Get a notification on this phone when an announcement is posted, including when the app is closed.</p>
      {error ? <p className="field-hint">{error}</p> : null}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={turnOn} disabled={busy}>
          {busy ? 'Turning on…' : 'Turn on alerts'}
        </button>
        {allowDismiss ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>Not now</button>
        ) : null}
      </div>
    </div>
  );
}
