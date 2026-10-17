import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';
import { isManualScheduleOrder, MANUAL_ORDER_BASE, sortScheduleItems } from '../../lib/scheduleOrder.js';

function blank() {
  return { id: null, time: '', title: '', description: '', active: true, sortOrder: 0 };
}

export default function AdminSchedule() {
  const { content, saveScheduleItem, saveScheduleOrder, deleteScheduleItemRow } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = sortScheduleItems(content.scheduleItems);
  const manual = isManualScheduleOrder(content.scheduleItems);

  async function save(item) {
    setBusy(true);
    try {
      const existing = content.scheduleItems.find((row) => row.id === item.id);
      const timeChanged = !existing || existing.time !== item.time;
      if (timeChanged) {
        const pool = content.scheduleItems.filter((row) => row.id !== item.id).concat(item);
        const next = sortScheduleItems(pool.map((row) => ({ ...row, sortOrder: 0 })));
        await saveScheduleOrder(next.map((row, index) => ({ ...row, sortOrder: index })));
      } else {
        await saveScheduleItem(item);
      }
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setBusy(true);
    try {
      await saveScheduleOrder(next.map((row, index) => ({ ...row, sortOrder: MANUAL_ORDER_BASE + index })));
    } finally {
      setBusy(false);
    }
  }

  async function orderByTime() {
    const next = sortScheduleItems(content.scheduleItems.map((row) => ({ ...row, sortOrder: 0 })));
    setBusy(true);
    try {
      await saveScheduleOrder(next.map((row, index) => ({ ...row, sortOrder: index })));
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
        <div className="field">
          <label>Time</label>
          <input value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} placeholder="3:00 PM" />
          <p className="field-hint">This places the item in the schedule. 3:00 PM comes before 4:00 PM and 5:00 PM.</p>
        </div>
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
      <p className="field-hint">
        {manual
          ? 'Custom order is saved. Order by time puts every item back in time order.'
          : 'Items are ordered by the time you enter. Use the arrows to set a custom order.'}
      </p>
      {manual && (
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={orderByTime}>Order by time</button>
      )}
      {items.map((s, index) => (
        <div key={s.id} className="card flat">
          <span className="pill-status on">{s.active ? 'Active' : 'Off'}</span>
          <h3 style={{ margin: '8px 0 4px' }}>{s.time} — {s.title || '(untitled)'}</h3>
          <p className="field-hint">{s.description}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => move(index, -1)} disabled={busy || index === 0}>↑</button>
            <button className="btn btn-secondary btn-sm" onClick={() => move(index, 1)} disabled={busy || index === items.length - 1}>↓</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(s)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
