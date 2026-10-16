import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminState } from '../../state/AdminState.jsx';

export default function AdminLogin() {
  const { signIn, authError } = useAdminState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate('/admin/overview');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const message = error || authError;

  return (
    <div className="screen" style={{ maxWidth: 360, margin: '0 auto', justifyContent: 'center', minHeight: '100svh' }}>
      <span className="eyebrow">Admin</span>
      <h1>Sign in</h1>
      <p>Real login — this account controls the live event for every guest.</p>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        {message && <p style={{ color: 'var(--danger)' }}>{message}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Just a sec…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
