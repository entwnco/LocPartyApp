import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

export default function AdminRaffle() {
  const { content, guests, totalEntries, saveRaffleConfig, closeRaffle, reopenRaffle, drawWinner, announceWinner, resetRaffleAction } = useAdminState();
  const [form, setForm] = useState(content.raffleConfig);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveRules() {
    setBusy(true);
    try {
      await saveRaffleConfig(form);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      await closeRaffle();
    } finally {
      setBusy(false);
    }
  }
  async function handleReopen() {
    setBusy(true);
    try {
      await reopenRaffle();
    } finally {
      setBusy(false);
    }
  }
  async function handleDraw() {
    setError('');
    setBusy(true);
    try {
      await drawWinner();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function handleAnnounce() {
    setBusy(true);
    try {
      await announceWinner();
    } finally {
      setBusy(false);
    }
  }
  async function handleReset() {
    if (!confirm('Reset the raffle? This clears all entries and any drawn winner.')) return;
    setBusy(true);
    try {
      await resetRaffleAction();
    } finally {
      setBusy(false);
    }
  }

  const winner = guests.find((g) => g.id === content.raffleConfig.winnerGuestId);
  const winnerName = winner ? winner.displayName : content.raffleConfig.winnerGuestId;

  return (
    <div className="stack">
      <h2>Raffle</h2>

      <div className="row" style={{ gap: 10 }}>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Status</div>
          <h3 style={{ marginTop: 8 }}>{content.raffleConfig.status}</h3>
        </div>
        <div className="card flat" style={{ flex: 1, textAlign: 'center' }}>
          <div className="eyebrow">Total tickets</div>
          <h3 style={{ marginTop: 8 }}>{totalEntries}</h3>
        </div>
      </div>

      {content.raffleConfig.status === 'drawn' && (
        <div className="card">
          <h3>Winning entry</h3>
          <p>Guest: {winnerName || '(unknown)'}</p>
          <div className="row" style={{ gap: 10 }}>
            {!content.raffleConfig.announced && (
              <button className="btn btn-primary btn-sm" onClick={handleAnnounce} disabled={busy}>Announce in-app</button>
            )}
            {content.raffleConfig.announced && <span className="tag">Announced</span>}
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {content.raffleConfig.status === 'open' && (
          <button className="btn btn-secondary" onClick={handleClose} disabled={busy}>Close raffle</button>
        )}
        {content.raffleConfig.status === 'closed' && (
          <>
            <button className="btn btn-secondary" onClick={handleReopen} disabled={busy}>Reopen</button>
            <button className="btn btn-primary" onClick={handleDraw} disabled={busy}>Draw winner</button>
          </>
        )}
        <button className="btn btn-danger" onClick={handleReset} disabled={busy}>Reset raffle</button>
      </div>

      <hr className="divider" />
      <h3>Raffle rules</h3>
      <div className="field"><label>Rules</label><textarea rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></div>
      <div className="field"><label>Prize</label><input value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}><label>Deadline</label><input type="datetime-local" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
        <div className="field" style={{ flex: 1 }}><label>Drawing time</label><input type="datetime-local" value={form.drawingTime || ''} onChange={(e) => setForm({ ...form, drawingTime: e.target.value })} /></div>
      </div>
      <div className="field"><label>Eligibility</label><input value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} /></div>
      <div className="field"><label>Contact method</label><input value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })} /></div>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={form.mustBePresent} onChange={(e) => setForm({ ...form, mustBePresent: e.target.checked })} />
        Winner must be present
      </label>
      <button className="btn btn-primary" onClick={saveRules} disabled={busy}>{busy ? 'Saving…' : 'Save rules'}</button>
    </div>
  );
}
