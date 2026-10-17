import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppState.jsx';
import { fileToResizedDataUrl } from '../lib/image.js';

export default function BingoSquare({ square, onClose }) {
  const { redeemBingoCode, completeBingoSquare } = useAppState();
  const [code, setCode] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [followUp, setFollowUp] = useState('');
  const isVendorClue = square.completionMode === 'vendor_code';
  const isAnswer = square.completionMode === 'answer';
  const isTrueFalse = square.completionMode === 'true_false';
  const title = isVendorClue ? 'Vendor Clue' : (square.poolId === 'games' && square.assignmentName ? square.assignmentName : square.title);
  const wallpaperPhone = square.id === 'task-10' ? '(321) 340-6734' : null;
  const answerLabel = square.id === 'task-10'
    ? 'How many do they offer?'
    : square.id === 'task-12'
      ? 'Code from the post'
      : 'Your answer';

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      onClose();
    } catch (err) {
      setError(err?.message || 'That code did not complete this square.');
    } finally {
      setBusy(false);
    }
  }

  async function submitChoice(choice) {
    setBusy(true);
    setError('');
    try {
      const result = await redeemBingoCode(square.id, choice);
      setFollowUp(result?.followUp || '');
    } catch (err) {
      setError(err?.message || 'That answer does not complete this square.');
    } finally {
      setBusy(false);
    }
  }

  async function finishSelf() {
    setBusy(true);
    setError('');
    try {
      await completeBingoSquare(square.id, square.completionMode === 'photo' ? photo : null);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not complete this square.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={onClose}>
        Close
      </button>
      <span className="tag">{square.area}</span>
      <h1 id="bingo-square-title">{title}</h1>
      <p>{square.prompt}</p>
      {isVendorClue && square.assignmentClue ? (
        <p style={{ whiteSpace: 'pre-line' }}>{square.assignmentClue}</p>
      ) : null}
      <p className="field-hint">Worth {square.points} points.</p>

      {wallpaperPhone && (
        <a href="tel:+13213406734" className="card flat" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <span className="eyebrow">Text</span>
          <h2 style={{ margin: '8px 0 0' }}>{wallpaperPhone}</h2>
        </a>
      )}

      {!isVendorClue && square.assignmentName && title !== square.assignmentName && (
        <div className="card flat">
          <span className="eyebrow">{square.poolId === 'games' ? 'Play this' : 'Game on duty'}</span>
          <h3 style={{ marginTop: 8 }}>{square.assignmentName}</h3>
          {square.assignmentDetail && <p className="field-hint" style={{ marginBottom: 0 }}>{square.assignmentDetail}</p>}
        </div>
      )}

      {square.completed && <div className="banner-demo">Completed.</div>}
      {((square.completed ? square.followUp : '') || followUp) && (
        <p>{(square.completed ? square.followUp : '') || followUp}</p>
      )}
      {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}

      {!square.completed && (isVendorClue || isAnswer) && (
        <form className="stack" onSubmit={redeem}>
          <div className="field">
            <label>{isAnswer ? answerLabel : 'Code word'}</label>
            <input
              type="text"
              value={code}
              inputMode={square.id === 'task-10' ? 'numeric' : 'text'}
              autoCapitalize={square.id === 'task-10' ? 'none' : 'characters'}
              autoCorrect="off"
              onChange={(e) => setCode(e.target.value)}
              placeholder={isAnswer ? 'Your answer' : 'Code word'}
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={!code.trim() || busy}>
            {busy ? 'Checking…' : isAnswer ? `Submit · +${square.points}` : 'Redeem code'}
          </button>
        </form>
      )}

      {!square.completed && isTrueFalse && (
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => submitChoice('true')}>
            True
          </button>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => submitChoice('false')}>
            False
          </button>
        </div>
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
