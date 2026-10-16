import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

export default function AdminBingo() {
  const { bingoStaff, advanceBingoPool } = useAdminState();
  const [busyPool, setBusyPool] = useState('');
  const [error, setError] = useState('');
  const squares = bingoStaff?.squares || [];
  const pools = bingoStaff?.pools || [];

  async function advance(poolId) {
    setBusyPool(poolId);
    setError('');
    try {
      await advanceBingoPool(poolId);
    } catch (err) {
      setError(err?.message || 'Could not advance that rotation.');
    } finally {
      setBusyPool('');
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ marginBottom: 6 }}>Bingo</h2>
        <p className="field-hint">
          Each guest keeps the booths and games that were next when they joined. Next in rotation is who the following guest gets.
        </p>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="bingo-grid">
        {squares.map((square) => (
          <div key={square.id} className="bingo-cell">
            <strong>{square.title}</strong>
            <span>
              {square.assignmentName ? (square.codeWord ? `${square.assignmentName} · ${square.codeWord}` : square.assignmentName) : `+${square.points}`}
              {square.completionCount ? ` · ${square.completionCount}` : ''}
            </span>
          </div>
        ))}
      </div>

      {pools.map((pool) => (
        <div key={pool.id} className="card flat">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>{pool.label}</h3>
            <button className="btn btn-secondary btn-sm" disabled={busyPool === pool.id} onClick={() => advance(pool.id)}>
              {busyPool === pool.id ? 'Moving…' : 'Next in rotation'}
            </button>
          </div>
          <div className="stack" style={{ marginTop: 12 }}>
            {(pool.members || []).map((member) => (
              <div key={member.position} className="row-between">
                <span>
                  {member.name}
                  {member.onDuty ? ' · next guest' : ''}
                </span>
                {member.codeWord ? <span className="tag">{member.codeWord}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
