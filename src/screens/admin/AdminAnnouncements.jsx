import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank() {
  return { id: null, title: '', body: '', active: true };
}

export default function AdminAnnouncements() {
  const { content, saveAnnouncement, deleteAnnouncementItem } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(item) {
    setBusy(true);
    try {
      await saveAnnouncement(item);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this announcement?')) return;
    await deleteAnnouncementItem(id);
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>Announcement</h2>
        <div className="field"><label>Title</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
        <div className="field"><label>Body</label><textarea rows={4} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.title.trim() || busy} onClick={() => save(editing)}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Announcements</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>+ New</button>
      </div>
      {content.announcements.map((a) => (
        <div key={a.id} className="card flat">
          <span className="pill-status on">{a.active ? 'Active' : 'Off'}</span>
          <h3 style={{ margin: '8px 0 4px' }}>{a.title || '(untitled)'}</h3>
          <p className="field-hint">{a.body}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(a)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
