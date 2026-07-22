import BackHeader from './BackHeader.jsx';

export default function EventMap() {
  return (
    <div className="screen">
      <BackHeader eyebrow="Event map" title="Find your way" />
      <div
        className="card flat"
        style={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'repeating-linear-gradient(45deg, var(--bg-elevated-2) 0 10px, var(--bg-elevated) 10px 20px)',
        }}
      >
        <span className="field-hint">Map placeholder — drop in the real venue map image here once it's ready.</span>
      </div>
      <p className="field-hint">Admin can replace this with an uploaded floor plan and pins once locations are set.</p>
    </div>
  );
}
