import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAppState } from '../../state/AppState.jsx';
import { MIN_REDEEM_POINTS, redeemQrPayload } from '../../lib/redeemQr.js';
import BackHeader from './BackHeader.jsx';

export default function Redeem() {
  const { guest, session, pointsTotal } = useAppState();
  const [qrUrl, setQrUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const email = session?.user?.email || '';
  const canRedeem = pointsTotal >= MIN_REDEEM_POINTS;

  useEffect(() => {
    let cancelled = false;
    setQrError('');
    QRCode.toDataURL(redeemQrPayload({ guestId: guest.id, email }), {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#17130d', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError('Could not build your code. Try again in a moment.');
      });
    return () => {
      cancelled = true;
    };
  }, [guest.id, email]);

  return (
    <div className="screen">
      <div>
        <BackHeader eyebrow="Redeem" title="Your code" />
        <p>Show this code to a host to exchange your points for rewards. The host will scan it and deduct the points from your balance.</p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 4 }}>{pointsTotal} points</h2>
        {!canRedeem && (
          <p className="field-hint" style={{ margin: 0 }}>
            Redeem starts at {MIN_REDEEM_POINTS} points. You have {pointsTotal}.
          </p>
        )}
      </div>

      {qrError ? <p style={{ color: 'var(--danger)' }}>{qrError}</p> : null}
      {qrUrl ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, alignSelf: 'center' }}>
          <img src={qrUrl} alt="Your redeem code" width={260} height={260} style={{ display: 'block' }} />
        </div>
      ) : (
        !qrError && <p className="field-hint">Building your code…</p>
      )}

      <div style={{ textAlign: 'center' }}>
        <strong>{guest.displayName}</strong>
        {email ? <p className="field-hint" style={{ margin: '4px 0 0' }}>{email}</p> : null}
      </div>
    </div>
  );
}
