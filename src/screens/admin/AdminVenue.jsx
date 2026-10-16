import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank(sortOrder) {
  return { id: null, title: '', description: '', active: true, sortOrder };
}

export default function AdminVenue() {
  const { content, saveVenueArea, deleteVenueArea } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const areas = content.venueAreas || [];

  async function save(area) {
    setBusy(true);
    try {
      await saveVenueArea(area);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this venue area?')) return;
    await deleteVenueArea(id);
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>Venue area</h2>
        <div className="field">
          <label>Name</label>
          <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Tagline</label>
          <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
        </div>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
          Shown to guests
        </label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.title.trim() || busy} onClick={() => save(editing)}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Venue</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank((areas.at(-1)?.sortOrder ?? 0) + 1))}>
          + New area
        </button>
      </div>
      <p className="field-hint">Guests see the active areas. Turn one off here and it disappears from their phones without an app update.</p>
      {areas.map((area) => (
        <div key={area.id} className="card flat">
          <span className={`pill-status ${area.active ? 'on' : 'off'}`}>{area.active ? 'Shown' : 'Hidden'}</span>
          <h3 style={{ margin: '8px 0 4px' }}>{area.title || '(untitled)'}</h3>
          <p className="field-hint">{area.description}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(area)}>Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={() => saveVenueArea({ ...area, active: !area.active })}>
              {area.active ? 'Hide' : 'Show'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(area.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
