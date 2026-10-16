import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppState.jsx';

const STORAGE_KEY = 'locparty-seen-announcements';

function seenKey(announcement) {
  return `${announcement.id}:${announcement.title}:${announcement.body}`;
}

function readSeen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasUnseenAnnouncement(announcements) {
  const seen = new Set(readSeen());
  return (announcements || []).some((announcement) => announcement.active && !seen.has(seenKey(announcement)));
}

export function markAnnouncementsSeen(announcements) {
  const seen = new Set(readSeen());
  for (const announcement of announcements || []) {
    if (announcement.active) seen.add(seenKey(announcement));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  window.dispatchEvent(new Event('locparty-announcements-seen'));
}

export function useUnseenAnnouncement() {
  const { content } = useAppState();
  const [unseen, setUnseen] = useState(() => hasUnseenAnnouncement(content.announcements));

  useEffect(() => {
    function update() {
      setUnseen(hasUnseenAnnouncement(content.announcements));
    }
    update();
    window.addEventListener('locparty-announcements-seen', update);
    return () => window.removeEventListener('locparty-announcements-seen', update);
  }, [content.announcements]);

  return unseen;
}
