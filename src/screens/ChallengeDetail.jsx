import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { fileToResizedDataUrl } from '../lib/image.js';

const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
    reader.onload = () => resolve(reader.result);
  });
}

export default function ChallengeDetail() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { guest, visibleChallenges, completions, completeChallenge, content } = useAppState();
  const challenge = visibleChallenges.find((c) => c.id === challengeId);
  const [answer, setAnswer] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!challenge) {
    return (
      <div className="screen">
        <div className="empty-state">This challenge isn't available right now.</div>
        <button className="btn btn-secondary" onClick={() => navigate('/hunt')}>
          Back to hunt
        </button>
      </div>
    );
  }

  const existing = completions.find((cp) => cp.guestId === guest.id && cp.challengeId === challenge.id);
  const vendor = challenge.vendorId ? content.vendors.find((v) => v.id === challenge.vendorId) : null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (challenge.proofType === 'video_upload') {
        if (!file.type.startsWith('video/')) throw new Error('Choose a video file.');
        if (file.size > MAX_VIDEO_BYTES) throw new Error('That video is too large. Keep it under 8MB.');
        setFileDataUrl(await fileToDataUrl(file));
      } else {
        setFileDataUrl(await fileToResizedDataUrl(file));
      }
    } catch (err) {
      console.error('Challenge file attach failed:', err);
      setError(err?.message || 'Could not read that file — try a different one.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleQrPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!('BarcodeDetector' in window)) {
      setError('This browser cannot read a QR photo. Type the code instead.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(bitmap);
      bitmap.close?.();
      const value = codes[0]?.rawValue;
      if (!value) throw new Error('No QR code found in that photo.');
      await submit({ type: 'qr_scan', value });
    } catch (err) {
      console.error('QR photo decode failed:', err);
      setError(err?.message || 'Could not read a QR code from that photo.');
      setBusy(false);
    }
  }

  async function submit(payload) {
    setBusy(true);
    setError('');
    try {
      await completeChallenge(challenge, payload);
      navigate('/hunt');
    } catch (err) {
      console.error('Challenge submission failed:', err);
      setError(err?.message || 'Submission failed — check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/hunt')}>
        ← Back to hunt
      </button>
      <span className="tag">{challenge.category}</span>
      <h1>{challenge.title}</h1>
      <p>{challenge.description}</p>
      {vendor && <p className="field-hint">Connected to: {vendor.name}</p>}
      <p className="field-hint">
        Reward: +{challenge.pointValue} points{content.raffleEnabled && challenge.entryValue ? ` · +${challenge.entryValue} raffle entries` : ''}
      </p>

      {existing?.status === 'approved' && <div className="banner-demo">Completed — nice work!</div>}
      {existing?.status === 'pending' && <div className="banner-demo">Submitted, waiting on review.</div>}
      {existing?.status === 'rejected' && <div className="banner-demo">Not approved — you can try again below.</div>}
      {error && <p style={{ color: 'var(--danger, #e05353)' }}>{error}</p>}

      {(!existing || existing.status === 'rejected') && (
        <>
          {challenge.proofType === 'check_in' && (
            <button className="btn btn-primary btn-block" disabled={busy} onClick={() => submit({ type: 'check_in' })}>
              {busy ? 'Submitting…' : 'Check in'}
            </button>
          )}

          {challenge.proofType === 'qr_scan' && (
            <div className="stack">
              <QrScanner disabled={busy} onScan={(value) => submit({ type: 'qr_scan', value })} />
              <div className="field">
                <label>Or type the code</label>
                <input type="text" value={answer} autoComplete="off" onChange={(e) => setAnswer(e.target.value)} placeholder="Enter code" />
              </div>
              <button className="btn btn-primary btn-block" disabled={!answer.trim() || busy} onClick={() => submit({ type: 'qr_scan', value: answer })}>
                {busy ? 'Submitting…' : 'Submit code'}
              </button>
              <label className="upload-box" style={{ display: 'block' }}>
                <span>Or upload a photo of the QR</span>
                <input type="file" accept="image/*" hidden disabled={busy} onChange={handleQrPhoto} />
              </label>
            </div>
          )}

          {challenge.proofType === 'secret_code' && (
            <div className="stack">
              <div className="field">
                <label>Secret code</label>
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Enter code" />
              </div>
              <button className="btn btn-primary btn-block" disabled={!answer.trim() || busy} onClick={() => submit({ type: 'secret_code', value: answer })}>
                {busy ? 'Submitting…' : 'Submit code'}
              </button>
            </div>
          )}

          {challenge.proofType === 'multiple_choice' && (
            <div className="stack">
              {(challenge.choices || []).length === 0 ? (
                <p className="field-hint">This question isn't set up yet.</p>
              ) : (
                challenge.choices.map((opt) => (
                  <button key={opt} className="choice" disabled={busy} onClick={() => submit({ type: 'multiple_choice', value: opt })}>
                    {opt}
                  </button>
                ))
              )}
            </div>
          )}

          {challenge.proofType === 'short_answer' && (
            <div className="stack">
              <div className="field">
                <label>Your answer</label>
                <textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={!answer.trim() || busy} onClick={() => submit({ type: 'short_answer', value: answer })}>
                {busy ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          )}

          {(challenge.proofType === 'photo_upload' || challenge.proofType === 'video_upload') && (
            <div className="stack">
              <label className="upload-box" style={{ display: 'block' }}>
                {fileDataUrl ? (
                  challenge.proofType === 'photo_upload' ? (
                    <img src={fileDataUrl} alt="Your submission" />
                  ) : (
                    <span>Video attached — tap to replace</span>
                  )
                ) : (
                  <span>{busy ? 'Loading…' : `Tap to upload a ${challenge.proofType === 'photo_upload' ? 'photo' : 'video'}`}</span>
                )}
                <input type="file" accept={challenge.proofType === 'photo_upload' ? 'image/*' : 'video/*'} hidden disabled={busy} onChange={handleFile} />
              </label>
              {challenge.proofType === 'video_upload' && fileDataUrl && (
                <video src={fileDataUrl} controls style={{ width: '100%', maxHeight: 280, borderRadius: 8 }} />
              )}
              {challenge.proofType === 'video_upload' && (
                <p className="field-hint">Keep the clip under 8MB.</p>
              )}
              <button className="btn btn-primary btn-block" disabled={!fileDataUrl || busy} onClick={() => submit({ type: challenge.proofType, data: fileDataUrl })}>
                {busy ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          )}

          {challenge.proofType === 'admin_approval' && (
            <button className="btn btn-primary btn-block" disabled={busy} onClick={() => submit({ type: 'admin_approval' })}>
              Request approval
            </button>
          )}
        </>
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
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return undefined;
    }

    let stream;
    let stopped = false;
    let timer;
    let pauseUntil = 0;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      setStatus('unsupported');
      return undefined;
    }

    (async () => {
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
                pauseUntil = Date.now() + 2000;
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
    return <p className="field-hint">This browser has no QR scanner. Type the code or upload a photo of it.</p>;
  }
  if (status === 'denied') {
    return <p className="field-hint">Camera permission is off. Type the code or upload a photo of it.</p>;
  }
  if (status === 'unavailable') {
    return <p className="field-hint">The camera didn't start. Type the code or upload a photo of it.</p>;
  }

  return (
    <div className="qr-view">
      <video ref={videoRef} playsInline muted autoPlay />
      {status === 'starting' && <p className="field-hint">Starting camera…</p>}
    </div>
  );
}
