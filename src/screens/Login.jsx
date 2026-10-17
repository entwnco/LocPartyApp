import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

export default function Login() {
  const { loginGuest, requestPasswordReset } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const g = await loginGuest({ email: email.trim(), password });
      navigate(g ? '/dashboard' : '/onboarding');
    } catch (err) {
      console.error('Login failed:', err);
      const msg = err?.message || '';
      setError(/invalid login credentials/i.test(msg) ? "That email/password doesn't match an account." : msg || 'Could not log in — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ minHeight: '100svh' }}>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => navigate('/')}>
        ← Back
      </button>
      <span className="eyebrow">Welcome back</span>
      <h2>Log in</h2>
      <p>Presented by the Entwined Collection</p>
      <p>Already checked in on another device? Sign in with the same email and password.</p>
      {showReset ? (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setResetSent(false);
            try {
              await requestPasswordReset(email);
              setResetSent(true);
            } catch (err) {
              setError(err?.message || 'Could not send a reset email.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="field-hint">We’ll email a link to choose a new password.</p>
          <div className="field">
            <label htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          {resetSent && <p className="field-hint">Check that inbox for the reset link, including spam.</p>}
          {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}
          <button type="submit" className="btn btn-secondary btn-block" disabled={!email.trim() || busy}>
            {busy ? 'Sending…' : 'Email me a reset link'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setShowReset(false);
              setError('');
              setResetSent(false);
            }}
          >
            Back to log in
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={!email.trim() || !password || busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
            onClick={() => {
              setShowReset(true);
              setError('');
            }}
          >
            Forgot password?
          </button>
        </form>
      )}
      <p className="field-hint">
        New here? <Link to="/onboarding">Create your account instead</Link>.
      </p>
    </div>
  );
}
