import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';
import { CHALLENGE_CATEGORIES, PROOF_TYPES, UNLOCK_TYPES, RELATIONSHIP_STATUSES } from '../../data/config.js';

function blankChallenge() {
  return {
    id: null,
    title: '',
    description: '',
    category: CHALLENGE_CATEGORIES[0],
    location: '',
    vendorId: null,
    startTime: null,
    endTime: null,
    pointValue: 10,
    entryValue: 0,
    proofType: 'check_in',
    unlock: { type: 'immediate' },
    completionMessage: '',
    active: true,
    sortOrder: 0,
  };
}

export default function AdminChallenges() {
  const { content, saveChallenge, deleteChallengeItem } = useAdminState();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(challenge) {
    setBusy(true);
    try {
      await saveChallenge(challenge);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this challenge?')) return;
    await deleteChallengeItem(id);
  }

  async function duplicate(challenge) {
    await saveChallenge({ ...challenge, id: null, title: `${challenge.title} (copy)` });
  }

  async function toggleActive(challenge) {
    await saveChallenge({ ...challenge, active: !challenge.active });
  }

  async function move(index, dir) {
    const list = content.challenges;
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    await Promise.all([
      saveChallenge({ ...a, sortOrder: b.sortOrder ?? target }),
      saveChallenge({ ...b, sortOrder: a.sortOrder ?? index }),
    ]);
  }

  if (editing) {
    return (
      <ChallengeForm
        challenge={editing}
        vendors={content.vendors}
        allChallenges={content.challenges}
        busy={busy}
        onSave={save}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Challenges</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blankChallenge())}>
          + New challenge
        </button>
      </div>
      <p className="field-hint">These are placeholder cards, not a finished hunt — edit freely as the event gets mapped out.</p>

      {content.challenges.map((c, i) => (
        <div key={c.id} className="card flat">
          <div className="row-between">
            <span className="pill-status on">{c.active ? 'Active' : 'Off'}</span>
            <span className="pill-status off">{c.unlock?.type}</span>
          </div>
          <h3 style={{ margin: '8px 0 4px' }}>{c.title || '(untitled)'}</h3>
          <p className="field-hint">{c.category} · +{c.pointValue} pts · +{c.entryValue} entries · {c.proofType}</p>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(c)}>Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={() => duplicate(c)}>Duplicate</button>
            <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => move(i, -1)}>↑</button>
            <button className="btn btn-secondary btn-sm" onClick={() => move(i, 1)}>↓</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallengeForm({ challenge, vendors, allChallenges, busy, onSave, onCancel }) {
  const [form, setForm] = useState(challenge);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setUnlock = (patch) => setForm((f) => ({ ...f, unlock: { ...f.unlock, ...patch } }));

  return (
    <div className="stack">
      <h2>{form.id ? 'Edit challenge' : 'New challenge'}</h2>

      <div className="field">
        <label>Title</label>
        <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })} />
      </div>

      <div className="field">
        <label>Description / clue</label>
        <textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Category</label>
          <select value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {CHALLENGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Location</label>
          <input type="text" value={form.location} onChange={(e) => set({ location: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <label>Vendor / activity connection</label>
        <select value={form.vendorId || ''} onChange={(e) => set({ vendorId: e.target.value || null })}>
          <option value="">None</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Start time</label>
          <input type="datetime-local" value={form.startTime || ''} onChange={(e) => set({ startTime: e.target.value || null })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>End time</label>
          <input type="datetime-local" value={form.endTime || ''} onChange={(e) => set({ endTime: e.target.value || null })} />
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Point value</label>
          <input type="number" value={form.pointValue} onChange={(e) => set({ pointValue: Number(e.target.value) })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Raffle-entry value</label>
          <input type="number" value={form.entryValue} onChange={(e) => set({ entryValue: Number(e.target.value) })} />
        </div>
      </div>

      <div className="field">
        <label>Proof type</label>
        <select value={form.proofType} onChange={(e) => set({ proofType: e.target.value })}>
          {PROOF_TYPES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Unlock rule</label>
        <select value={form.unlock?.type} onChange={(e) => setUnlock({ type: e.target.value })}>
          {UNLOCK_TYPES.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
      </div>

      {form.unlock?.type === 'scheduled' && (
        <div className="field">
          <label>Unlocks at</label>
          <input type="datetime-local" value={form.unlock.unlockAt || ''} onChange={(e) => setUnlock({ unlockAt: e.target.value })} />
        </div>
      )}

      {form.unlock?.type === 'after_challenge' && (
        <div className="field">
          <label>Requires challenge</label>
          <select value={form.unlock.challengeId || ''} onChange={(e) => setUnlock({ challengeId: e.target.value })}>
            <option value="">Choose one</option>
            {allChallenges.filter((c) => c.id !== form.id).map((c) => (
              <option key={c.id} value={c.id}>{c.title || c.id}</option>
            ))}
          </select>
        </div>
      )}

      {form.unlock?.type === 'point_threshold' && (
        <div className="field">
          <label>Minimum points</label>
          <input type="number" value={form.unlock.minPoints || 0} onChange={(e) => setUnlock({ minPoints: Number(e.target.value) })} />
        </div>
      )}

      {form.unlock?.type === 'relationship_group' && (
        <div className="field">
          <label>Groups that see this</label>
          <div className="choice-grid">
            {RELATIONSHIP_STATUSES.map((s) => {
              const selected = (form.unlock.groups || []).includes(s.theme);
              return (
                <button
                  key={s.id}
                  className={`choice ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    const groups = form.unlock.groups || [];
                    setUnlock({
                      groups: selected ? groups.filter((g) => g !== s.theme) : [...groups, s.theme],
                    });
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {form.unlock?.type === 'hidden' && (
        <p className="field-hint">
          Stays invisible to guests until you manually trigger it for someone from Overview/Submissions later.
        </p>
      )}

      <div className="field">
        <label>Completion message</label>
        <input type="text" value={form.completionMessage} onChange={(e) => set({ completionMessage: e.target.value })} />
      </div>

      <div className="row">
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
          Active
        </label>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" disabled={!form.title.trim() || busy} onClick={() => onSave(form)}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
