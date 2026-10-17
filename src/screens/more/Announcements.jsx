import { useEffect } from 'react';
import { useAppState } from '../../state/AppState.jsx';
import AnnouncementAlerts from '../../components/AnnouncementAlerts.jsx';
import BackHeader from './BackHeader.jsx';
import { markAnnouncementsSeen } from '../../lib/seenAnnouncements.js';

export default function Announcements() {
  const { content } = useAppState();
  const items = content.announcements.filter((a) => a.active);

  useEffect(() => {
    markAnnouncementsSeen(content.announcements);
  }, [content.announcements]);

  return (
    <div className="screen">
      <BackHeader eyebrow="Announcements" title="Live updates" />
      <AnnouncementAlerts allowDismiss={false} />
      {items.length === 0 ? (
        <div className="empty-state">Nothing posted yet.</div>
      ) : (
        <div className="stack">
          {items.map((a) => (
            <div key={a.id} className="card">
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
