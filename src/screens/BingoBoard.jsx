import { useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import BingoSquare from './BingoSquare.jsx';

function SquareTitle({ children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const cell = el?.parentElement;
    if (!el || !cell) return;
    let size = 13;
    const fits = () => {
      const box = cell.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].every(
        (rect) => rect.left >= box.left + 1 && rect.right <= box.right - 1 && rect.bottom <= box.bottom - 1
      );
    };
    el.style.fontSize = `${size}px`;
    while (size > 9 && !fits()) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, [children]);
  return <strong ref={ref}>{children}</strong>;
}

function squareLabel(square) {
  if (square.completionMode === 'vendor_code') return 'Vendor Clue';
  if (square.poolId === 'games' && square.assignmentName) return square.assignmentName;
  return square.title;
}

export default function BingoBoard() {
  const { squareId } = useParams();
  const navigate = useNavigate();
  const { bingoBoard } = useAppState();
  const done = bingoBoard.filter((square) => square.completed).length;
  const openSquare = squareId ? bingoBoard.find((square) => square.id === squareId) : null;

  function close() {
    navigate('/bingo');
  }

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Bingo</span>
        <h1>Your card</h1>
        <p>
          {done} of {bingoBoard.length || 25} squares. Booth squares ask for a code word. Games rotate, and you mark those yourself.
        </p>
      </div>

      {bingoBoard.length === 0 ? (
        <div className="empty-state">The bingo card is still loading.</div>
      ) : (
        <div className="bingo-grid">
          {bingoBoard.map((square) => (
            <button
              key={square.id}
              type="button"
              className={`bingo-cell${square.completed ? ' done' : ''}${square.id === 'free' ? ' free' : ''}`}
              onClick={() => navigate(`/bingo/${square.id}`)}
            >
              <SquareTitle>{squareLabel(square)}</SquareTitle>
            </button>
          ))}
        </div>
      )}

      {squareId && (
        <div className="bingo-modal-overlay" onClick={close}>
          <div
            className="bingo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bingo-square-title"
            onClick={(event) => event.stopPropagation()}
          >
            {openSquare ? (
              <BingoSquare square={openSquare} onClose={close} />
            ) : bingoBoard.length > 0 ? (
              <div className="stack">
                <div className="empty-state">That square isn't on this card.</div>
                <button type="button" className="btn btn-secondary" onClick={close}>Close</button>
              </div>
            ) : (
              <p className="field-hint">Loading…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
