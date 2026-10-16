import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';

const STORAGE_KEY = 'locparty-dismissed-announcements';

function readDismissed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AnnouncementBanner() {
  const { content } = useAppState();
  const [dismissed, setDismissed] = useState(readDismissed);
  const announcement = content.announcements.find((a) => a.active);

  if (!announcement || dismissed.includes(announcement.id)) return null;

  function dismiss() {
    const next = [...dismissed, announcement.id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="announce-banner" role="status">
      <Link to="/announcements" className="announce-banner-link">
        <span className="tag">Update</span>
        <strong>{announcement.title}</strong>
        {announcement.body ? <span className="announce-banner-body">{announcement.body}</span> : null}
      </Link>
      <button type="button" className="announce-banner-dismiss" onClick={dismiss} aria-label="Dismiss announcement">
        ×
      </button>
    </div>
  );
}
