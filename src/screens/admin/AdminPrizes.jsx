import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank() {
  return { id: null, title: '', description: '', active: true, sortOrder: 0 };
}

export default function AdminPrizes() {
  const { content, savePrize, deletePrizeItem } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(item) {
    setBusy(true);
    try {
      await savePrize(item);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this prize?')) return;
    await deletePrizeItem(id);
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>Prize</h2>
        <div className="field"><label>Title</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.title.trim() || busy} onClick={() => save(editing)}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Prizes</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>+ New prize</button>
      </div>
      {content.prizes.map((p) => (
        <div key={p.id} className="card flat">
          <span className="pill-status on">{p.active ? 'Active' : 'Off'}</span>
          <h3 style={{ margin: '8px 0 4px' }}>{p.title || '(untitled)'}</h3>
          <p className="field-hint">{p.description}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(p)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
