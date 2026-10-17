import { useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';

const POOL_ORDER = ['loc-hair', 'body-care', 'fashion'];

function poolLabel(pool) {
  if (pool.id === 'fashion') return 'Marketplace';
  return pool.label;
}

export default function AdminCodes() {
  const { bingoStaff, saveVendorCode } = useAdminState();
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState('');
  const [savedId, setSavedId] = useState('');
  const [error, setError] = useState('');

  const pools = (bingoStaff?.pools || [])
    .map((pool) => ({
      ...pool,
      vendors: (pool.members || []).filter((member) => member.vendorId),
    }))
    .filter((pool) => pool.vendors.length > 0)
    .sort((a, b) => POOL_ORDER.indexOf(a.id) - POOL_ORDER.indexOf(b.id));

  function codeFor(vendor) {
    return drafts[vendor.vendorId] ?? vendor.codeWord ?? '';
  }

  async function save(vendor) {
    const codeWord = codeFor(vendor).trim();
    setBusyId(vendor.vendorId);
    setSavedId('');
    setError('');
    try {
      await saveVendorCode(vendor.vendorId, vendor.clue || '', codeWord);
      setDrafts((current) => {
        const next = { ...current };
        delete next[vendor.vendorId];
        return next;
      });
      setSavedId(vendor.vendorId);
    } catch (err) {
      setError(err?.message || 'Could not save that code.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 style={{ marginBottom: 6 }}>Vendor codes</h2>
        <p className="field-hint">
          These are the answers guests type for a vendor clue. Spaces and capital letters do not matter.
        </p>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {pools.length === 0 ? (
        <div className="empty-state">Vendor codes are still loading.</div>
      ) : (
        pools.map((pool) => (
          <div key={pool.id} className="stack">
            <h3 style={{ marginBottom: 0 }}>{poolLabel(pool)}</h3>
            {pool.vendors.map((vendor) => {
              const code = codeFor(vendor);
              const changed = code.trim() !== (vendor.codeWord || '');
              return (
                <div key={vendor.vendorId} className="card flat">
                  <h3 style={{ marginTop: 0 }}>{vendor.name}</h3>
                  {vendor.clue ? (
                    <p className="field-hint" style={{ whiteSpace: 'pre-line' }}>{vendor.clue}</p>
                  ) : (
                    <p className="field-hint">No riddle yet. Guests still need this code to finish the square.</p>
                  )}
                  <div className="field">
                    <label htmlFor={`code-${vendor.vendorId}`}>Code</label>
                    <input
                      id={`code-${vendor.vendorId}`}
                      value={code}
                      maxLength={40}
                      onChange={(e) => setDrafts((current) => ({ ...current, [vendor.vendorId]: e.target.value }))}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!changed || !code.trim() || busyId === vendor.vendorId}
                    onClick={() => save(vendor)}
                  >
                    {busyId === vendor.vendorId ? 'Saving…' : savedId === vendor.vendorId && !changed ? 'Saved' : 'Save code'}
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
