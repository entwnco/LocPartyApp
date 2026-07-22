import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function blank() {
  return { id: null, name: '', category: '', description: '', location: '', logoUrl: null, isFeatured: false, active: true, sortOrder: 0 };
}

export default function AdminVendors() {
  const { content, saveVendor, deleteVendorItem, uploadVendorLogo } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadVendorLogo(file, editing.id);
      setEditing((cur) => ({ ...cur, logoUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  if (editing) {
    return (
      <div className="stack">
        <h2>{editing.id ? 'Edit vendor' : 'New vendor'}</h2>
        <div className="field">
          <label>Logo / photo</label>
          <label className="upload-box" style={{ display: 'block' }}>
            {editing.logoUrl ? (
              <img src={editing.logoUrl} alt={`${editing.name || 'Vendor'} logo`} />
            ) : (
              <span>{uploading ? 'Uploading…' : 'Tap to choose a photo'}</span>
            )}
            <input type="file" accept="image/*" hidden disabled={uploading} onChange={handleLogoChange} />
          </label>
          {editing.logoUrl && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setEditing({ ...editing, logoUrl: null })}
            >
              Remove photo
            </button>
          )}
        </div>
        <div className="field"><label>Name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
        <div className="field"><label>Category</label><input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
        <div className="field"><label>Location</label><input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.isFeatured} onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })} /> Featured</label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.name.trim() || busy || uploading} onClick={() => save(editing)}>{busy ? 'Saving…' : 'Save'}</button>
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
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            {v.logoUrl && <img src={v.logoUrl} alt="" className="vendor-thumb" />}
            <div>
              <h3 style={{ margin: '0 0 4px' }}>{v.name || '(untitled)'}</h3>
              <p className="field-hint" style={{ margin: 0 }}>{v.category} · {v.location}</p>
            </div>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(v)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
