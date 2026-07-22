import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminState } from '../../state/AdminState.jsx';

export default function AdminLogin() {
  const { signIn, signUp } = useAdminState();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        navigate('/admin/overview');
      } else {
        const { session } = await signUp(email.trim(), password);
        if (session) {
          navigate('/admin/overview');
        } else {
          setInfo('Account created — check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 360, margin: '0 auto', justifyContent: 'center', minHeight: '100svh' }}>
      <span className="eyebrow">Admin</span>
      <h1>{mode === 'signin' ? 'Sign in' : 'Create admin account'}</h1>
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
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {info && <p className="field-hint">{info}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Just a sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button
        className="btn btn-ghost"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError('');
          setInfo('');
        }}
      >
        {mode === 'signin' ? "First time? Create an admin account" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
