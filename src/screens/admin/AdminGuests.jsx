import { useMemo, useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';

function statusLabel(id) {
  return RELATIONSHIP_STATUSES.find((s) => s.id === id)?.label || null;
}

function formatJoined(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AdminGuests() {
  const { guests, pointsLedger, raffleLedger } = useAdminState();
  const [query, setQuery] = useState('');

  const totalsByGuest = useMemo(() => {
    const map = new Map();
    for (const g of guests) map.set(g.id, { points: 0, entries: 0 });
    for (const p of pointsLedger) {
      const row = map.get(p.guestId);
      if (row) row.points += p.amount;
    }
    for (const e of raffleLedger) {
      const row = map.get(e.guestId);
      if (row) row.entries += e.count;
    }
    return map;
  }, [guests, pointsLedger, raffleLedger]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? guests.filter((g) => g.displayName?.toLowerCase().includes(q)) : guests;
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [guests, query]);

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Guests</h2>
        <span className="field-hint" style={{ margin: 0 }}>{guests.length} checked in</span>
      </div>

      <div className="field">
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">No guests yet.</div>
      ) : (
        sorted.map((g) => {
          const totals = totalsByGuest.get(g.id) || { points: 0, entries: 0 };
          const status = statusLabel(g.relationshipStatusId);
          return (
            <div key={g.id} className="card flat">
              <div className="row" style={{ gap: 10 }}>
                {g.photoDataUrl && <img src={g.photoDataUrl} alt="" className="vendor-thumb" />}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px' }}>{g.displayName || '(no name)'}</h3>
                  <p className="field-hint" style={{ margin: 0 }}>
                    Joined {formatJoined(g.createdAt)}
                    {status ? ` · ${status}` : ''}
                    {g.hereFor ? ` · here for ${g.hereFor}` : ''}
                  </p>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <span className="tag">{totals.points} pts</span>
                <span className="tag">{totals.entries} {totals.entries === 1 ? 'entry' : 'entries'}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
