import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank() {
  return { id: null, name: '', category: '', description: '', location: '', isFeatured: false, active: true, sortOrder: 0 };
}

export default function AdminVendors() {
  const { content, saveVendor, deleteVendorItem } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(v) {
    setBusy(true);
    try {
      await saveVendor(v);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this vendor?')) return;
    await deleteVendorItem(id);
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>{editing.id ? 'Edit vendor' : 'New vendor'}</h2>
        <div className="field"><label>Name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
        <div className="field"><label>Category</label><input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
        <div className="field"><label>Location</label><input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.isFeatured} onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })} /> Featured</label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.name.trim() || busy} onClick={() => save(editing)}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Vendors</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>+ New vendor</button>
      </div>
      {content.vendors.map((v) => (
        <div key={v.id} className="card flat">
          <div className="row-between">
            <span className="pill-status on">{v.active ? 'Active' : 'Off'}</span>
            {v.isFeatured && <span className="tag">Featured</span>}
          </div>
          <h3 style={{ margin: '8px 0 4px' }}>{v.name || '(untitled)'}</h3>
          <p className="field-hint">{v.category} · {v.location}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(v)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
