import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

export default function Login() {
  const { loginGuest } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      <span className="eyebrow">Welcome back</span>
      <h2>Log in</h2>
      <p>Already checked in on another device? Sign in with the same email and password.</p>
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
      </form>
      <p className="field-hint">
        New here? <Link to="/onboarding">Create your account instead</Link>.
      </p>
    </div>
  );
}
