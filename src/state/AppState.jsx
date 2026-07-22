import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ensureGuestSession } from '../lib/supabaseClient.js';
import * as api from '../lib/api.js';
import { fileToResizedBlob } from '../lib/image.js';
import { visibleChallengesFor } from '../lib/unlock.js';
import { RELATIONSHIP_STATUSES } from '../data/config.js';

const AppStateContext = createContext(null);

const EMPTY_CONTENT = {
  challenges: [],
  vendors: [],
  scheduleItems: [],
  announcements: [],
  prizes: [],
  raffleConfig: {
    rules: '',
    prize: '',
    deadline: null,
    drawingTime: null,
    eligibility: '',
    contactMethod: '',
    mustBePresent: false,
    status: 'open',
    winnerGuestId: null,
    announced: false,
    drawnAt: null,
  },
  pointValues: {},
  raffleEntrySources: {},
  themeColors: {},
};

export function AppStateProvider({ children }) {
  const [guest, setGuest] = useState(null);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [completions, setCompletions] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);
  const [raffleLedger, setRaffleLedger] = useState([]);
  const [triggeredHiddenIds, setTriggeredHiddenIds] = useState([]);
  const [celebrations, setCelebrations] = useState([]);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(null);

  const pushCelebration = useCallback((message, kind = 'points') => {
    const id = `cel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCelebrations((list) => [...list, { id, message, kind }]);
    setTimeout(() => {
      setCelebrations((list) => list.filter((c) => c.id !== id));
    }, 2200);
  }, []);

  const loadContent = useCallback(async () => {
    const c = await api.fetchAllContent();
    setContent(c);
  }, []);

  const loadGuestActivity = useCallback(async (guestId) => {
    const [pts, ent, comps, hidden] = await Promise.all([
      api.fetchGuestPoints(guestId),
      api.fetchGuestEntries(guestId),
      api.fetchGuestCompletions(guestId),
      api.fetchTriggeredHidden(guestId),
    ]);
    setPointsLedger(pts);
    setRaffleLedger(ent);
    setCompletions(comps);
    setTriggeredHiddenIds(hidden);
  }, []);

  // boot: anonymous session -> content -> this device's guest row (if any)
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;
    (async () => {
      try {
        const session = await ensureGuestSession();
        await loadContent();
        const g = await api.fetchGuestByAuthId(session.user.id);
        if (cancelled) return;
        setGuest(g);
        if (g) await loadGuestActivity(g.id);
        if (cancelled) return;

        unsubscribe = api.subscribeToLiveChanges(async (table) => {
          if (['challenges', 'vendors', 'schedule_items', 'announcements', 'prizes', 'raffle_config', 'app_config'].includes(table)) {
            loadContent();
          }
          if (g && ['points_ledger', 'raffle_ledger', 'completions', 'triggered_hidden'].includes(table)) {
            loadGuestActivity(g.id);
          }
        });
      } catch (err) {
        // Surface the failure instead of leaving the app stuck on
        // "loading" forever with no visible button or error.
        console.error('Loc Party failed to start:', err);
        if (!cancelled) setBootError(err?.message || 'Something went wrong loading the app.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshContent = useCallback(() => loadContent(), [loadContent]);

  const createGuest = useCallback(
    async (profile) => {
      const session = await ensureGuestSession();
      const g = await api.createGuestRow(session.user.id, profile.displayName);
      setGuest(g);
      const r = await api.awardPoints(g.id, 'createProfile', content.pointValues.createProfile, 'Created your party profile');
      await api.awardEntries(g.id, 'registration', content.raffleEntrySources.registration.entries, content.raffleEntrySources.registration.label);
      if (r.awarded) pushCelebration(`+${content.pointValues.createProfile} points — welcome in!`);
      await loadGuestActivity(g.id);
      return g;
    },
    [content, pushCelebration, loadGuestActivity]
  );

  const updateGuest = useCallback(
    async (patch) => {
      if (!guest) return null;
      const next = await api.updateGuestRow(guest.id, patch);
      setGuest(next);
      return next;
    },
    [guest]
  );

  const setRelationshipStatus = useCallback(
    async (statusId) => {
      const status = RELATIONSHIP_STATUSES.find((s) => s.id === statusId);
      const next = await updateGuest({ relationshipStatusId: statusId, relationshipTheme: status ? status.theme : null });
      const pv = content.pointValues.selectRelationshipStatus;
      const r = await api.awardPoints(next.id, 'selectRelationshipStatus', pv, 'Shared relationship status');
      if (r.awarded) pushCelebration(`+${pv} points!`);
      await loadGuestActivity(next.id);
      return next;
    },
    [updateGuest, content, pushCelebration, loadGuestActivity]
  );

  const addProfilePhoto = useCallback(
    async (file) => {
      if (!guest) return null;
      const blob = await fileToResizedBlob(file);
      const url = await api.uploadPhoto(guest.authUserId, blob, 'profile.jpg');
      const next = await updateGuest({ photoDataUrl: url });
      const pv = content.pointValues.profilePhoto;
      const r = await api.awardPoints(next.id, 'profilePhoto', pv, 'Added a profile photo');
      if (r.awarded) pushCelebration(`+${pv} points!`);
      await loadGuestActivity(next.id);
      return next;
    },
    [guest, updateGuest, content, pushCelebration, loadGuestActivity]
  );

  const uploadLook = useCallback(
    async (file) => {
      if (!guest) return null;
      const blob = await fileToResizedBlob(file);
      const url = await api.uploadPhoto(guest.authUserId, blob, 'look.jpg');
      const next = await updateGuest({ lookPhotoDataUrl: url });
      const pv = content.pointValues.uploadLook;
      const sources = content.raffleEntrySources.uploadLook;
      const r = await api.awardPoints(next.id, 'uploadLook', pv, 'Uploaded Loc Party look');
      await api.awardEntries(next.id, 'uploadLook', sources.entries, sources.label);
      if (r.awarded) pushCelebration(`+${pv} points + a raffle entry!`, 'entry');
      await loadGuestActivity(next.id);
      return next;
    },
    [guest, updateGuest, content, pushCelebration, loadGuestActivity]
  );

  const completeChallenge = useCallback(
    async (challenge, proofPayload) => {
      if (!guest) return { status: 'error' };
      const needsApproval = ['photo_upload', 'video_upload', 'short_answer', 'admin_approval'].includes(challenge.proofType);
      const status = needsApproval ? 'pending' : 'approved';
      const record = await api.submitCompletion(guest.id, challenge.id, challenge.proofType, proofPayload, status);

      if (!needsApproval) {
        const r = await api.awardPoints(guest.id, `challenge:${challenge.id}`, challenge.pointValue, challenge.title);
        if (challenge.entryValue > 0) {
          await api.awardEntries(guest.id, `challenge:${challenge.id}`, challenge.entryValue, challenge.title);
        }
        if (r.awarded) pushCelebration(challenge.completionMessage || `+${challenge.pointValue} points!`);
      } else {
        pushCelebration('Submitted! Waiting on a quick review.', 'pending');
      }
      await loadGuestActivity(guest.id);
      return { status: record.status, record };
    },
    [guest, pushCelebration, loadGuestActivity]
  );

  const pointsTotal = useMemo(() => pointsLedger.reduce((s, e) => s + e.amount, 0), [pointsLedger]);
  const entryCount = useMemo(() => raffleLedger.reduce((s, e) => s + e.count, 0), [raffleLedger]);

  const completedChallengeIds = useMemo(
    () => completions.filter((c) => c.status === 'approved').map((c) => c.challengeId),
    [completions]
  );

  const visibleChallenges = useMemo(
    () =>
      visibleChallengesFor(content.challenges, {
        guest,
        pointsTotal,
        completedChallengeIds,
        triggeredHiddenIds,
      }),
    [content.challenges, guest, pointsTotal, completedChallengeIds, triggeredHiddenIds]
  );

  const value = {
    guest,
    content,
    completions,
    celebrations,
    ready,
    bootError,
    refreshContent,
    createGuest,
    updateGuest,
    setRelationshipStatus,
    uploadLook,
    addProfilePhoto,
    completeChallenge,
    pushCelebration,
    pointsTotal,
    pointsHistory: pointsLedger,
    entryCount,
    entries: raffleLedger,
    completedChallengeIds,
    visibleChallenges,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
