import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="screen" style={{ minHeight: '100svh' }}>
      <span className="eyebrow">Missing page</span>
      <h1>That page isn't part of the party</h1>
      <p>The link may be old, or the address was typed wrong.</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
        Back to the start
      </button>
    </div>
  );
}
