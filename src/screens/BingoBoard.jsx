import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

export default function BingoBoard() {
  const { bingoBoard } = useAppState();
  const done = bingoBoard.filter((square) => square.completed).length;

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Bingo</span>
        <h1>Your card</h1>
        <p>
          {done} of {bingoBoard.length || 25} squares. Loc-shop booths ask for a code word. Games rotate, and you mark those yourself.
        </p>
      </div>

      {bingoBoard.length === 0 ? (
        <div className="empty-state">The bingo card is still loading.</div>
      ) : (
        <div className="bingo-grid">
          {bingoBoard.map((square) => (
            <Link
              key={square.id}
              to={`/bingo/${square.id}`}
              className={`bingo-cell${square.completed ? ' done' : ''}${square.id === 'free' ? ' free' : ''}`}
            >
              <strong>{square.title}</strong>
              <span>{square.completed ? 'Done' : `+${square.points}`}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
