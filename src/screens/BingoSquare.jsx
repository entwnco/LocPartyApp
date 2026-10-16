import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { fileToResizedDataUrl } from '../lib/image.js';

export default function BingoSquare() {
  const { squareId } = useParams();
  const navigate = useNavigate();
  const { bingoBoard, redeemBingoCode, completeBingoSquare } = useAppState();
  const square = bingoBoard.find((item) => item.id === squareId);
  const [code, setCode] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!square) {
    return (
      <div className="screen">
        <div className="empty-state">That square isn't on this card.</div>
        <button className="btn btn-secondary" onClick={() => navigate('/bingo')}>
          Back to bingo
        </button>
      </div>
    );
  }

  const needsCode = square.completionMode === 'vendor_code';
  const isGame = Boolean(square.assignmentName) && !needsCode;

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setPhoto(await fileToResizedDataUrl(file));
    } catch (err) {
      setError(err?.message || 'Could not read that photo.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function redeem(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await redeemBingoCode(square.id, code);
      navigate('/bingo');
    } catch (err) {
      setError(err?.message || 'That code did not complete this square.');
    } finally {
      setBusy(false);
    }
  }

  async function finishSelf() {
    setBusy(true);
    setError('');
    try {
      await completeBingoSquare(square.id, square.completionMode === 'photo' ? photo : null);
      navigate('/bingo');
    } catch (err) {
      setError(err?.message || 'Could not complete this square.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/bingo')}>
        ← Back to bingo
      </button>
      <span className="tag">{square.area}</span>
      <h1>{square.title}</h1>
      <p>{square.prompt}</p>
      <p className="field-hint">Worth {square.points} points.</p>

      {square.assignmentName && (
        <div className="card flat">
          <span className="eyebrow">{isGame ? 'Game on duty' : 'Booth on duty'}</span>
          <h3 style={{ marginTop: 8 }}>{square.assignmentName}</h3>
          {square.assignmentClue && <p>{square.assignmentClue}</p>}
          {square.assignmentDetail && <p className="field-hint" style={{ marginBottom: 0 }}>{square.assignmentDetail}</p>}
        </div>
      )}

      {square.completed && <div className="banner-demo">Completed.</div>}
      {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}

      {!square.completed && needsCode && (
        <form className="stack" onSubmit={redeem}>
          <div className="field">
            <label>Code word</label>
            <input
              type="text"
              value={code}
              autoCapitalize="characters"
              autoCorrect="off"
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ask them for the word"
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={!code.trim() || busy}>
            {busy ? 'Checking…' : 'Redeem code'}
          </button>
        </form>
      )}

      {!square.completed && square.completionMode === 'photo' && (
        <div className="stack">
          <label className="upload-box" style={{ display: 'block' }}>
            {photo ? <img src={photo} alt="Your bingo photo" /> : <span>{busy ? 'Loading…' : 'Tap to add a photo'}</span>}
            <input type="file" accept="image/*" hidden onChange={handlePhoto} />
          </label>
          <button className="btn btn-primary btn-block" disabled={!photo || busy} onClick={finishSelf}>
            {busy ? 'Saving…' : `Mark complete · +${square.points}`}
          </button>
        </div>
      )}

      {!square.completed && square.completionMode === 'self' && (
        <button className="btn btn-primary btn-block" disabled={busy} onClick={finishSelf}>
          {busy ? 'Saving…' : `I did this · +${square.points}`}
        </button>
      )}
    </div>
  );
}
