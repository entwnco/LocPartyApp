import { useMemo, useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

function ticketsFor(points) {
  return Math.max(0, Math.floor(points / 50));
}

export default function AdminRaffle() {
  const { guests, pointsLedger, spins, spinRaffle, undoLastSpin } = useAdminState();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pointsByGuest = useMemo(() => {
    const map = new Map();
    for (const row of pointsLedger) map.set(row.guestId, (map.get(row.guestId) || 0) + row.amount);
    return map;
  }, [pointsLedger]);

  const wonIds = useMemo(() => new Set(spins.map((spin) => spin.guestId)), [spins]);

  const pool = useMemo(() => {
    return guests
      .map((guest) => {
        const points = pointsByGuest.get(guest.id) || 0;
        return { guest, points, tickets: ticketsFor(points) };
      })
      .filter((row) => row.tickets > 0 && !wonIds.has(row.guest.id))
      .sort((a, b) => b.tickets - a.tickets || a.guest.displayName.localeCompare(b.guest.displayName));
  }, [guests, pointsByGuest, wonIds]);

  const totalTickets = pool.reduce((sum, row) => sum + row.tickets, 0);

  async function spin() {
    setError('');
    setBusy(true);
    try {
      await spinRaffle();
    } catch (err) {
      setError(err?.message || 'The spin did not finish.');
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!spins.length) return;
    const last = spins[spins.length - 1];
    if (!confirm(`Undo spin ${last.spinNumber}?`)) return;
    setError('');
    setBusy(true);
    try {
      await undoLastSpin();
    } catch (err) {
      setError(err?.message || 'Could not undo that spin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ marginBottom: 6 }}>Draw</h2>
        <p className="field-hint">
          Spins are the winner list, in order. Match prizes to that order in person. A guest’s tickets are their points divided by 50, rounded down. Nobody wins twice.
        </p>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">In the pool</div>
          <h3 style={{ marginTop: 8 }}>{pool.length}</h3>
        </div>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Tickets</div>
          <h3 style={{ marginTop: 8 }}>{totalTickets}</h3>
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">Next spin</span>
        <h3 style={{ marginTop: 8 }}>{spins.length + 1}</h3>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={spin} disabled={busy}>
            {busy ? 'Spinning…' : 'Spin'}
          </button>
          <button className="btn btn-secondary" onClick={undo} disabled={busy || spins.length === 0}>
            Undo last spin
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <h3>Spins</h3>
      {spins.length === 0 ? (
        <p className="field-hint">No winners yet.</p>
      ) : (
        spins.map((spinRow) => {
          const guest = guests.find((item) => item.id === spinRow.guestId);
          const name = guest?.displayName || spinRow.guestName || 'Guest';
          return (
            <div key={spinRow.id} className="card flat">
              <span className="eyebrow">Spin {spinRow.spinNumber}</span>
              <h3 style={{ margin: '8px 0 4px' }}>{name}</h3>
              <p style={{ margin: 0 }}>{spinRow.email || 'No email on the account'}</p>
              <p className="field-hint" style={{ marginBottom: 0 }}>
                {guest?.groupNumber ? `Group ${guest.groupNumber} · ` : ''}
                {spinRow.tickets} {spinRow.tickets === 1 ? 'ticket' : 'tickets'} from {spinRow.points} points
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
