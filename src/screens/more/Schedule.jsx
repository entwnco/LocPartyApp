import { useAppState } from '../../state/AppState.jsx';
import { sortScheduleItems } from '../../lib/scheduleOrder.js';

export default function Schedule() {
  const { content } = useAppState();
  const items = sortScheduleItems(content.scheduleItems).filter((s) => s.active);
  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Event schedule</span>
        <h1>Tonight</h1>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">Schedule is still being finalized — check back soon.</div>
      ) : (
        <div className="stack">
          {items.map((s) => (
            <div key={s.id} className="card flat">
              <span className="tag">{s.time}</span>
              <h3 style={{ marginTop: 8 }}>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
