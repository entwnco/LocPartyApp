import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

const STOPS = [
  { value: 0, label: 'First square in this category' },
  { value: 1, label: 'Second square in this category' },
  { value: 2, label: 'Third square in this category' },
];

function modeLabel(square) {
  if (square.id === 'free' || square.completionMode === 'free') return 'Free';
  if (square.completionMode === 'photo') return 'Photo';
  if (square.completionMode === 'vendor_code') return 'Answer';
  if (square.completionMode === 'answer') return 'Question';
  if (square.completionMode === 'true_false') return 'True / false';
  if (square.poolId) return 'Category';
  return 'Self';
}

function vendorClues(pool, riddles) {
  const clues = {};
  for (const member of pool?.members || []) {
    if (!member.vendorId) continue;
    const chosen = (riddles || []).find(
      (riddle) => riddle.vendorId === member.vendorId && riddle.clue === (member.clue || ''),
    );
    clues[member.vendorId] = {
      vendorId: member.vendorId,
      name: member.name,
      clue: member.clue || '',
      codeWord: member.codeWord || '',
      riddleId: chosen?.id || '',
    };
  }
  return clues;
}

export default function AdminBingo() {
  const { bingoStaff, advanceBingoPool, saveBingoSquare } = useAdminState();
  const [busyPool, setBusyPool] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const squares = bingoStaff?.squares || [];
  const pools = bingoStaff?.pools || [];
  const vendorPools = pools.filter((pool) => (pool.members || []).some((member) => member.vendorId));

  function openSquare(square) {
    const poolId = square.poolId || '';
    setError('');
    setEditing({
      id: square.id,
      title: square.title,
      prompt: square.prompt || '',
      area: square.area || '',
      points: square.points,
      completionMode: square.id === 'free' ? 'free' : square.completionMode,
      poolId,
      poolOffset: square.poolOffset || 0,
      secretAnswer: bingoStaff?.answers?.[square.id] || '',
      clues: vendorClues(pools.find((pool) => pool.id === poolId), bingoStaff?.riddles),
    });
  }

  function setPool(poolId) {
    setEditing((current) => ({
      ...current,
      poolId,
      clues: vendorClues(pools.find((pool) => pool.id === poolId), bingoStaff?.riddles),
    }));
  }

  function chooseRiddle(vendorId, riddleId) {
    const riddle = (bingoStaff?.riddles || []).find((item) => item.id === riddleId);
    setEditing((current) => ({
      ...current,
      clues: {
        ...current.clues,
        [vendorId]: {
          ...current.clues[vendorId],
          riddleId,
          clue: riddle ? riddle.clue : current.clues[vendorId].clue,
          codeWord: riddle ? riddle.answer : current.clues[vendorId].codeWord,
        },
      },
    }));
  }

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

  async function save() {
    setBusy(true);
    setError('');
    try {
      const usesPool = editing.completionMode === 'vendor_code' || editing.poolId;
      await saveBingoSquare(
        {
          id: editing.id,
          title: editing.title,
          prompt: editing.prompt,
          area: editing.area,
          points: Number(editing.points) || 0,
          completionMode: editing.completionMode,
          poolId: usesPool ? editing.poolId : null,
          poolOffset: usesPool ? Number(editing.poolOffset) || 0 : 0,
          secretAnswer: editing.secretAnswer || '',
        },
        editing.completionMode === 'vendor_code' ? Object.values(editing.clues) : [],
      );
      setEditing(null);
    } catch (err) {
      setError(err?.message || 'Could not save that square.');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    const isFree = editing.id === 'free';
    const needsAnswer = editing.completionMode === 'vendor_code';
    const showCategory = !isFree && (needsAnswer || editing.poolId || editing.completionMode === 'self' || editing.completionMode === 'photo');
    return (
      <div className="stack">
        <h2>{isFree ? 'Free space' : 'Square'}</h2>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="field">
          <label>Title</label>
          <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Prompt</label>
          <textarea rows={4} value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} />
        </div>
        <div className="field">
          <label>Area tag</label>
          <input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} />
        </div>
        <div className="field">
          <label>Points</label>
          <input
            type="number"
            min="0"
            max="500"
            value={editing.points}
            onChange={(e) => setEditing({ ...editing, points: e.target.value })}
          />
        </div>
        {isFree ? (
          <p className="field-hint">This center square completes itself and stays the free gift.</p>
        ) : (
          <div className="field">
            <label>How it completes</label>
            <select
              value={editing.completionMode}
              onChange={(e) => {
                const completionMode = e.target.value;
                const poolId = completionMode === 'vendor_code' && !editing.poolId
                  ? (vendorPools[0]?.id || '')
                  : (completionMode === 'answer' || completionMode === 'true_false' ? '' : editing.poolId);
                const secretAnswer = completionMode === 'true_false'
                  && editing.secretAnswer !== 'TRUE'
                  && editing.secretAnswer !== 'FALSE'
                  ? 'TRUE'
                  : editing.secretAnswer;
                setEditing({
                  ...editing,
                  completionMode,
                  poolId,
                  secretAnswer,
                  clues: vendorClues(pools.find((pool) => pool.id === poolId), bingoStaff?.riddles),
                });
              }}
            >
              <option value="self">I did this</option>
              <option value="photo">Photo</option>
              <option value="vendor_code">Answer from the assigned booth</option>
              <option value="answer">Typed answer</option>
              <option value="true_false">True or false</option>
            </select>
          </div>
        )}
        {(editing.completionMode === 'answer' || editing.completionMode === 'true_false') && (
          <div className="field">
            <label>{editing.completionMode === 'true_false' ? 'Correct answer' : 'Accepted answer'}</label>
            {editing.completionMode === 'true_false' ? (
              <select
                value={editing.secretAnswer === 'FALSE' ? 'FALSE' : 'TRUE'}
                onChange={(e) => setEditing({ ...editing, secretAnswer: e.target.value })}
              >
                <option value="TRUE">True</option>
                <option value="FALSE">False</option>
              </select>
            ) : (
              <input
                value={editing.secretAnswer || ''}
                onChange={(e) => setEditing({ ...editing, secretAnswer: e.target.value })}
              />
            )}
            <p className="field-hint">Guests do not see this. Leave a typed answer blank to keep the square locked until you set the code. Switch this square to “I did this” if you want guests to self-report instead.</p>
          </div>
        )}
        {showCategory && !isFree && (
          <>
            {!needsAnswer && (
              <label className="row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!editing.poolId}
                  onChange={(e) => setPool(e.target.checked ? (vendorPools[0]?.id || pools[0]?.id || '') : '')}
                />
                Show a booth or game from a category
              </label>
            )}
            {(needsAnswer || editing.poolId) && (
              <div className="field">
                <label>Category</label>
                <select value={editing.poolId} onChange={(e) => setPool(e.target.value)}>
                  {(needsAnswer ? vendorPools : pools).map((pool) => (
                    <option key={pool.id} value={pool.id}>{pool.id === 'fashion' ? 'Marketplace' : pool.label}</option>
                  ))}
                </select>
              </div>
            )}
            {(needsAnswer || editing.poolId) && (
              <div className="field">
                <label>Which square this is in the category</label>
                <select
                  value={editing.poolOffset}
                  onChange={(e) => setEditing({ ...editing, poolOffset: Number(e.target.value) })}
                >
                  {STOPS.map((stop) => (
                    <option key={stop.value} value={stop.value}>{stop.label}</option>
                  ))}
                </select>
                <p className="field-hint">Give each square in the same category a different one, so a guest gets a different booth on each.</p>
              </div>
            )}
          </>
        )}
        {needsAnswer && (
          <div className="stack">
            <p className="field-hint">Choose the riddle for each booth. The guest sees the riddle, and the answer stays hidden. The booth list itself stays as it is.</p>
            {Object.values(editing.clues).map((clue) => {
              const options = (bingoStaff?.riddles || []).filter((riddle) => riddle.vendorId === clue.vendorId);
              return (
              <div key={clue.vendorId} className="card flat">
                <h3 style={{ marginTop: 0 }}>{clue.name}</h3>
                {options.length > 0 && (
                  <div className="field">
                    <label>Riddle</label>
                    <select value={clue.riddleId} onChange={(e) => chooseRiddle(clue.vendorId, e.target.value)}>
                      <option value="">Custom</option>
                      {options.map((riddle) => (
                        <option key={riddle.id} value={riddle.id}>{riddle.answer}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Clue</label>
                  <textarea
                    rows={5}
                    value={clue.clue}
                    onChange={(e) => setEditing({
                      ...editing,
                      clues: { ...editing.clues, [clue.vendorId]: { ...clue, clue: e.target.value, riddleId: '' } },
                    })}
                  />
                </div>
                <div className="field">
                  <label>Answer</label>
                  <input
                    value={clue.codeWord}
                    onChange={(e) => setEditing({
                      ...editing,
                      clues: { ...editing.clues, [clue.vendorId]: { ...clue, codeWord: e.target.value } },
                    })}
                  />
                </div>
              </div>
              );
            })}
          </div>
        )}
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.title.trim() || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ marginBottom: 6 }}>Bingo</h2>
        <p className="field-hint">
          Tap a square to change its wording or how it is completed. A finished square stays finished. Next in rotation is who the following guest gets.
        </p>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="bingo-grid">
        {squares.map((square) => (
          <button key={square.id} type="button" className={`bingo-cell${square.id === 'free' ? ' free' : ''}`} onClick={() => openSquare(square)}>
            <strong>{square.title}</strong>
            <span>
              {modeLabel(square)}
              {square.completionCount ? ` · ${square.completionCount}` : ''}
            </span>
          </button>
        ))}
      </div>

      {pools.map((pool) => (
        <div key={pool.id} className="card flat">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>{pool.id === 'fashion' ? 'Marketplace' : pool.label}</h3>
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
