import { useAppState } from '../../state/AppState.jsx';
import BackHeader from './BackHeader.jsx';

export default function Prizes() {
  const { content } = useAppState();
  const prizes = content.prizes.filter((p) => p.active);

  return (
    <div className="screen">
      <BackHeader eyebrow="Prizes" title="What's up for grabs" />
      {prizes.length === 0 ? (
        <div className="empty-state">Prizes haven't been finalized yet.</div>
      ) : (
        <div className="stack">
          {prizes.map((p) => (
            <div key={p.id} className="card flat">
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
