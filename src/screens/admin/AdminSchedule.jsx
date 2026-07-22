import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank() {
  return { id: null, time: '', title: '', description: '', active: true, sortOrder: 0 };
}

export default function AdminSchedule() {
  const { content, saveScheduleItem, deleteScheduleItemRow } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(item) {
    setBusy(true);
    try {
      await saveScheduleItem(item);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this schedule item?')) return;
    await deleteScheduleItemRow(id);
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>Schedule item</h2>
        <div className="field"><label>Time label</label><input value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} placeholder="e.g. 7:30 PM" /></div>
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
        <h2 style={{ margin: 0 }}>Schedule</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>+ New item</button>
      </div>
      {content.scheduleItems.map((s) => (
        <div key={s.id} className="card flat">
          <span className="pill-status on">{s.active ? 'Active' : 'Off'}</span>
          <h3 style={{ margin: '8px 0 4px' }}>{s.time} — {s.title || '(untitled)'}</h3>
          <p className="field-hint">{s.description}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(s)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
