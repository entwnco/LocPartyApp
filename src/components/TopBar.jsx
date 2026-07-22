import { useAppState } from '../state/AppState.jsx';

export default function TopBar() {
  const { pointsTotal } = useAppState();
  return (
    <div className="topbar">
      <span className="brand">
        The Loc <em>Party</em>
      </span>
      <span className="points-chip">
        <span className="num">{pointsTotal}</span> pts
      </span>
    </div>
  );
}
