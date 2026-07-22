import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

export default function Announcements() {
  const { content } = useAppState();
  const items = content.announcements.filter((a) => a.active);

  return (
    <div className="screen">
      <BackHeader eyebrow="Announcements" title="Live updates" />
      {items.length === 0 ? (
        <div className="empty-state">Nothing posted yet.</div>
      ) : (
        <div className="stack">
          {items.map((a) => (
            <div key={a.id} className="card">
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
