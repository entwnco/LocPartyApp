import { useEffect, useRef, useState } from 'react';
import { useAdminState } from '../../state/AdminState.jsx';
import {
  MIN_REDEEM_POINTS,
  defaultRedeemAmount,
  parseRedeemAmount,
  parseRedeemQr,
  redeemAmountError,
} from '../../lib/redeemQr.js';
import { createQrDetector } from '../../lib/qrReader.js';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AdminRedeem() {
  const { previewRedemption, redeemGuestPoints, loadRedemptions } = useAdminState();
  const [phase, setPhase] = useState('scan');
  const [preview, setPreview] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [emailQuery, setEmailQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function refreshHistory() {
    try {
      setHistory(await loadRedemptions());
    } catch (err) {
      console.error('Redemption history failed:', err);
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadRedemptions()
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => console.error('Redemption history failed:', err));
    return () => {
      cancelled = true;
    };
  }, [loadRedemptions]);

  async function lookup(query) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setPhase('loading');
    try {
      const data = await previewRedemption(query);
      setPreview(data);
      setAmountText(String(defaultRedeemAmount(data.points)));
      setNote('');
      setResult(null);
      setPhase('review');
    } catch (err) {
      console.error('Redeem lookup failed:', err);
      setPhase('scan');
      setError(err?.message || 'Could not look up that guest.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function onScan(raw) {
    const parsed = parseRedeemQr(raw);
    if (!parsed) {
      setError("That isn't a guest redeem code.");
      return;
    }
    lookup({ guestId: parsed.guestId });
  }

  function scanAgain() {
    setPreview(null);
    setResult(null);
    setAmountText('');
    setNote('');
    setError('');
    setPhase('scan');
  }

  async function confirmRedeem(event) {
    event.preventDefault();
    if (!preview || busyRef.current) return;
    const amount = parseRedeemAmount(amountText);
    const problem = redeemAmountError(amount, preview.points);
    if (problem) {
      setError(problem);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await redeemGuestPoints(preview.guestId, amount, note);
      setResult(saved);
      setPhase('done');
      await refreshHistory();
    } catch (err) {
      console.error('Redeem failed:', err);
      setError(err?.message || 'Could not redeem those points.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const suggested = preview ? defaultRedeemAmount(preview.points) : 0;
  const typedAmount = preview ? parseRedeemAmount(amountText) : null;
  const amountProblem = preview && preview.points >= MIN_REDEEM_POINTS ? redeemAmountError(typedAmount, preview.points) : '';

  return (
    <div className="stack">
      <div>
        <h2 style={{ margin: 0 }}>Redeem</h2>
        <p className="field-hint">Scan a guest code. The amount starts at the highest multiple of 50, and moves in steps of 50.</p>
      </div>

      {error && phase !== 'review' ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}

      {phase === 'scan' && (
        <>
          <QrScanner disabled={busy} onScan={onScan} />
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const email = emailQuery.trim();
              if (!email) return;
              lookup({ email });
            }}
          >
            <div className="field">
              <label htmlFor="redeem-email">Or look up their email</label>
              <input
                id="redeem-email"
                type="email"
                autoComplete="off"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                placeholder="guest@email.com"
              />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={!emailQuery.trim() || busy}>
              {busy ? 'Looking up…' : 'Look up'}
            </button>
          </form>
        </>
      )}

      {phase === 'loading' && <p className="field-hint">Looking up that guest…</p>}

      {phase === 'review' && preview && (
        <form className="stack" onSubmit={confirmRedeem}>
          <div className="card flat">
            <h3 style={{ margin: '0 0 4px' }}>{preview.displayName || 'Guest'}</h3>
            <p className="field-hint" style={{ margin: 0 }}>{preview.email || 'No email on the account'}</p>
            <p style={{ margin: '10px 0 0' }}>
              <strong>{preview.points}</strong> points on the account
            </p>
          </div>

          {preview.points < MIN_REDEEM_POINTS ? (
            <p style={{ margin: 0 }}>They need at least {MIN_REDEEM_POINTS} points before anything can be redeemed.</p>
          ) : (
            <>
              <div className="field">
                <label id="redeem-amount-label">Points to redeem</label>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label="Decrease by 50"
                    disabled={(typedAmount || 0) <= MIN_REDEEM_POINTS}
                    onClick={() => {
                      setAmountText(String((typedAmount || suggested) - MIN_REDEEM_POINTS));
                      setError('');
                    }}
                  >
                    −50
                  </button>
                  <strong aria-labelledby="redeem-amount-label" style={{ fontSize: '1.8rem', minWidth: '4ch', textAlign: 'center' }}>
                    {typedAmount || suggested}
                  </strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label="Increase by 50"
                    disabled={(typedAmount || 0) + MIN_REDEEM_POINTS > suggested}
                    onClick={() => {
                      setAmountText(String((typedAmount || suggested) + MIN_REDEEM_POINTS));
                      setError('');
                    }}
                  >
                    +50
                  </button>
                </div>
                <p className="field-hint">
                  {suggested === MIN_REDEEM_POINTS
                    ? `They can redeem ${MIN_REDEEM_POINTS} points.`
                    : `Steps of 50, from 50 up to ${suggested}.`}
                </p>
              </div>
              <div className="field">
                <label htmlFor="redeem-note">Exchanged for</label>
                <input
                  id="redeem-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                  maxLength={140}
                />
              </div>
              {amountText.trim() !== '' && amountProblem ? <p style={{ color: 'var(--danger)', margin: 0 }}>{amountProblem}</p> : null}
              {error ? <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={busy || !!amountProblem}>
                {busy ? 'Redeeming…' : `Redeem ${typedAmount || ''} points`}
              </button>
            </>
          )}

          <button className="btn btn-secondary" type="button" onClick={scanAgain} disabled={busy}>
            Scan someone else
          </button>
        </form>
      )}

      {phase === 'done' && result && (
        <div className="stack">
          <div className="card flat">
            <span className="pill-status on">Redeemed</span>
            <h3 style={{ margin: '8px 0 4px' }}>{result.amount} points</h3>
            <p style={{ margin: 0 }}>{result.displayName}{result.email ? ` · ${result.email}` : ''}</p>
            {result.note ? <p className="field-hint">For {result.note}</p> : null}
            <p className="field-hint" style={{ margin: 0 }}>{result.points} points left</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={scanAgain}>
            Scan next guest
          </button>
        </div>
      )}

      {history.length > 0 && phase !== 'review' && (
        <div className="stack">
          <h3>Recent</h3>
          {history.map((row) => (
            <div key={row.id} className="card flat row-between">
              <div>
                <strong>{row.guestName || 'Guest'}</strong>
                <p className="field-hint" style={{ margin: 0 }}>
                  {formatWhen(row.createdAt)}
                  {row.note ? ` · ${row.note}` : ''}
                </p>
              </div>
              <strong style={{ color: 'var(--danger)' }}>−{row.amount}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QrScanner({ disabled, onScan }) {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  const disabledRef = useRef(disabled);
  const [status, setStatus] = useState('starting');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return undefined;
    }

    let stream;
    let stopped = false;
    let timer;
    let pauseUntil = 0;

    (async () => {
      let detector;
      try {
        detector = await createQrDetector();
      } catch {
        if (!stopped) setStatus('unsupported');
        return;
      }
      if (stopped) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (stopped) return;
        setStatus('live');

        const tick = async () => {
          if (stopped) return;
          if (!disabledRef.current && Date.now() >= pauseUntil && video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue;
              if (value) {
                pauseUntil = Date.now() + 1500;
                onScanRef.current(value);
              }
            } catch {
              // A frame can fail while the camera is still starting.
            }
          }
          timer = window.setTimeout(tick, 300);
        };
        timer = window.setTimeout(tick, 300);
      } catch (err) {
        if (!stopped) setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (status === 'unsupported') {
    return <p className="field-hint">This browser has no QR scanner. Look the guest up by email instead.</p>;
  }
  if (status === 'denied') {
    return <p className="field-hint">Camera permission is off. Allow it, or look the guest up by email.</p>;
  }
  if (status === 'unavailable') {
    return <p className="field-hint">The camera didn't start. Look the guest up by email instead.</p>;
  }

  return (
    <div className="qr-view">
      <video ref={videoRef} playsInline muted autoPlay />
      {status === 'starting' && <p className="field-hint">Starting camera…</p>}
    </div>
  );
}
