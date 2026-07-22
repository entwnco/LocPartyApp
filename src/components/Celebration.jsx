import { useAppState } from '../state/AppState.jsx';

const CONFETTI_COLORS = ['#f2b33d', '#ff5c5c', '#9b5de5', '#2ec4b6', '#e86a92'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  return (
    <>
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.2;
        const duration = 1.1 + Math.random() * 0.6;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </>
  );
}

export default function Celebration() {
  const { celebrations } = useAppState();
  if (celebrations.length === 0) return null;
  const current = celebrations[celebrations.length - 1];
  return (
    <div className="celebration-layer" aria-live="polite">
      {current.kind !== 'pending' && <ConfettiBurst />}
      <div className="celebration-toast">{current.message}</div>
    </div>
  );
}
