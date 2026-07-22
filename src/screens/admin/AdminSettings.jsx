import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';
import { RELATIONSHIP_STATUSES } from '../../data/config.js';

export default function AdminSettings() {
  const { session, content, guests, pointsLedger, raffleLedger, completions, savePointValues, saveThemeColors } = useAdminState();
  const [pointValues, setPointValues] = useState(content.pointValues);
  const [themeColors, setThemeColors] = useState(content.themeColors);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');

  async function handleSavePointValues() {
    setBusy(true);
    try {
      await savePointValues(pointValues);
      setSaved('points');
      setTimeout(() => setSaved(''), 1500);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveThemeColors() {
    setBusy(true);
    try {
      await saveThemeColors(themeColors);
      setSaved('colors');
      setTimeout(() => setSaved(''), 1500);
    } finally {
      setBusy(false);
    }
  }

  function exportData() {
    const data = { content, guests, pointsLedger, raffleLedger, completions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loc-party-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <h2>Settings</h2>

      <h3>Point values</h3>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(pointValues).map(([key, value]) => (
          <div className="field" key={key} style={{ flex: '1 1 140px' }}>
            <label>{key}</label>
            <input type="number" value={value} onChange={(e) => setPointValues({ ...pointValues, [key]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleSavePointValues} disabled={busy}>
        {saved === 'points' ? 'Saved!' : 'Save point values'}
      </button>

      <hr className="divider" />
      <h3>Relationship-status accent colors</h3>
      <p className="field-hint">Changes apply instantly across the guest app — no code edits or rebuilds.</p>
      <div className="stack">
        {RELATIONSHIP_STATUSES.map((s) => (
          <div key={s.id} className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span style={{ width: 150 }}>{s.label}</span>
            <input
              type="color"
              value={themeColors[s.theme]?.accent || '#f2b33d'}
              onChange={(e) => setThemeColors({ ...themeColors, [s.theme]: { ...themeColors[s.theme], accent: e.target.value } })}
            />
            <input
              type="color"
              value={themeColors[s.theme]?.ink || '#111111'}
              onChange={(e) => setThemeColors({ ...themeColors, [s.theme]: { ...themeColors[s.theme], ink: e.target.value } })}
              title="Text color on top of the accent"
            />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleSaveThemeColors} disabled={busy}>
        {saved === 'colors' ? 'Saved!' : 'Save colors'}
      </button>

      <hr className="divider" />
      <h3>Account</h3>
      <p className="field-hint">Signed in as {session?.user?.email}.</p>

      <hr className="divider" />
      <h3>Data</h3>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-secondary" onClick={exportData}>Export all data (JSON)</button>
      </div>
      <p className="field-hint">
        A full snapshot of live content, guests, points, entries, and submissions — pulled straight from the database.
      </p>
    </div>
  );
}
