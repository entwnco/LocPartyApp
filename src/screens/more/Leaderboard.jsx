import { useEffect, useState } from 'react';
import { useAppState } from '../../state/AppState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import * as api from '../../lib/api.js';
import BackHeader from './BackHeader.jsx';

export default function Leaderboard() {
  const { guest } = useAppState();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.fetchLeaderboard(100);
        if (!cancelled) setRows(data);
      } catch (err) {
        console.error('Leaderboard failed to load:', err);
        if (!cancelled) setError('Could not load the leaderboard right now.');
      }
    }

    load();

    // Re-fetch whenever anyone's points change, so this stays live during
    // the party without the guest needing to pull-to-refresh.
    const channel = supabase
      .channel('leaderboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points_ledger' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="screen">
      <BackHeader eyebrow="Leaderboard" title="Top of the party" />

      {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}

      {rows === null && !error && <div className="empty-state">Loading…</div>}

      {rows && rows.length === 0 && <div className="empty-state">No points on the board yet — be the first!</div>}

      {rows && rows.length > 0 && (
        <div className="stack">
          {rows.map((r) => {
            const isYou = guest && r.guestId === guest.id;
            return (
              <div
                key={r.guestId}
                className="card flat"
                style={isYou ? { borderColor: 'var(--accent)', borderWidth: 2, borderStyle: 'solid' } : undefined}
              >
                <div className="row-between">
                  <span>
                    {r.rank}. {r.displayName || '(no name)'} {isYou && <span className="tag">You</span>}
                  </span>
                  <strong style={{ color: 'var(--accent)' }}>{r.totalPoints} pts</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="field-hint">Admins can hide the leaderboard entirely from Settings if it's not wanted for this event.</p>
    </div>
  );
}
