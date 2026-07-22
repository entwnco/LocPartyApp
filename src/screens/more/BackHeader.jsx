import { useNavigate } from 'react-router-dom';

export default function BackHeader({ title, eyebrow }) {
  const navigate = useNavigate();
  return (
    <div>
      <button className="btn btn-ghost" style={{ paddingLeft: 0 }} onClick={() => navigate('/more')}>
        ← More
      </button>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
    </div>
  );
}
