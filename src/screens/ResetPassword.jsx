import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

function readRecoveryTokens() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = params.get('code') || '';
  const accessToken = hash.get('access_token') || '';
  const refreshToken = hash.get('refresh_token') || '';
  if (!code && !(accessToken && refreshToken)) return null;
  return { code, accessToken, refreshToken };
}

let recoveryTask = null;
let recoveryKey = '';

export default function ResetPassword() {
  const { completePasswordRecovery, updatePassword, guest } = useAppState();
  const navigate = useNavigate();
  const [tokens] = useState(readRecoveryTokens);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokens) {
      setError('Open the reset link from your email on this phone.');
      setChecking(false);
      return undefined;
    }
    const key = tokens.code || tokens.accessToken;
    if (!recoveryTask || recoveryKey !== key) {
      recoveryKey = key;
      recoveryTask = completePasswordRecovery(tokens);
    }
    let cancelled = false;
    recoveryTask
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'That reset link is invalid or expired.');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [completePasswordRecovery, tokens]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      navigate(guest ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err?.message || 'Could not update that password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ minHeight: '100svh' }}>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => navigate('/login')}>
        ← Back
      </button>
      <span className="eyebrow">Account</span>
      <h2>Choose a new password</h2>
      {checking ? (
        <p className="field-hint">Checking your reset link…</p>
      ) : ready ? (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || password.length < 6 || !confirm}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      ) : (
        <>
          {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Back to log in
          </button>
        </>
      )}
    </div>
  );
}
