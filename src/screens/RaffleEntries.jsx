import { useState } from 'react';
import { useAppState } from '../state/AppState.jsx';

export default function RaffleEntries() {
  const { entryCount, entries, content, guest, pointsTotal, buyRaffleEntry } = useAppState();
  const { raffleConfig } = content;
  const isWinner = raffleConfig.status === 'drawn' && raffleConfig.announced && raffleConfig.winnerGuestId === guest.id;
  const buyCost = content.pointValues.buyEntryCost ?? 50;
  const [busy, setBusy] = useState(false);

  async function handleBuy() {
    setBusy(true);
    try {
      await buyRaffleEntry(1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">My raffle entries</span>
        <h1>{entryCount} entries</h1>
        <p>{raffleConfig.eligibility}</p>
      </div>

      {isWinner && (
        <div className="card" style={{ borderTopColor: 'var(--accent)' }}>
          <h2>🎉 You won!</h2>
          <p>{raffleConfig.prize}</p>
        </div>
      )}

      {raffleConfig.status === 'drawn' && raffleConfig.announced && !isWinner && (
        <div className="banner-demo">The raffle has been drawn. Check Announcements for the winner.</div>
      )}

      {raffleConfig.status === 'open' && (
        <div className="card flat">
          <div className="row-between">
            <span>Your points</span>
            <strong>{pointsTotal}</strong>
          </div>
          <hr className="divider" />
          <p style={{ margin: '0 0 10px' }}>Spend points for extra raffle entries — {buyCost} pts each.</p>
          <button
            className="btn btn-primary btn-block"
            disabled={busy || pointsTotal < buyCost}
            onClick={handleBuy}
          >
            {busy ? 'Buying…' : `Buy 1 entry — ${buyCost} pts`}
          </button>
          {pointsTotal < buyCost && <p className="field-hint">Not enough points yet.</p>}
        </div>
      )}

      <div className="card flat">
        <div className="row-between">
          <span>Status</span>
          <span className="pill-status on">{raffleConfig.status}</span>
        </div>
        <hr className="divider" />
        <div className="row-between">
          <span>Prize</span>
          <span>{raffleConfig.prize}</span>
        </div>
        <div className="row-between">
          <span>Deadline</span>
          <span>{raffleConfig.deadline || 'TBD'}</span>
        </div>
        <div className="row-between">
          <span>Drawing time</span>
          <span>{raffleConfig.drawingTime || 'TBD'}</span>
        </div>
        <div className="row-between">
          <span>Must be present</span>
          <span>{raffleConfig.mustBePresent ? 'Yes' : 'No'}</span>
        </div>
        <div className="row-between">
          <span>Contact method</span>
          <span>{raffleConfig.contactMethod}</span>
        </div>
      </div>

      <h2>How you earned entries</h2>
      {entries.length === 0 ? (
        <div className="empty-state">No entries yet — complete challenges or visit vendors to earn some.</div>
      ) : (
        <div className="stack">
          {entries.map((e) => (
            <div key={e.id} className="card flat row-between">
              <span>{e.label}</span>
              <strong style={{ color: 'var(--accent)' }}>+{e.count}</strong>
            </div>
          ))}
        </div>
      )}

      <p className="field-hint">{raffleConfig.rules}</p>
    </div>
  );
}
