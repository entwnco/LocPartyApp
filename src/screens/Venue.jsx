import { useAppState } from '../state/AppState.jsx';

export default function Venue() {
  const { content } = useAppState();
  const areas = (content.venueAreas || []).filter((area) => area.active);

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Venue</span>
        <h1>Find your way</h1>
      </div>
      {areas.length === 0 ? (
        <div className="empty-state">Venue areas are still being set.</div>
      ) : (
        <div className="stack">
          {areas.map((area) => (
            <div key={area.id} className="card flat">
              <h3 style={{ marginTop: 0 }}>{area.title}</h3>
              <p style={{ marginBottom: 0 }}>{area.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
