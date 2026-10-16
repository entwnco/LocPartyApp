import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, getGuestSession } from '../lib/supabaseClient.js';
import * as api from '../lib/api.js';
import { fileToResizedBlob } from '../lib/image.js';
import { visibleChallengesFor } from '../lib/unlock.js';
import { RELATIONSHIP_STATUSES } from '../data/config.js';

const AppStateContext = createContext(null);

const EMPTY_CONTENT = {
  challenges: [],
  vendors: [],
  scheduleItems: [],
  venueAreas: [],
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
  huntTitle: 'Your map through the Loc Party',
  huntBody: 'Complete challenges, visit vendors, and catch hidden moments to earn points. Tap any card below to jump in — new ones unlock as the night goes on.',
  raffleEnabled: false,
};

export function AppStateProvider({ children }) {
  const [guest, setGuest] = useState(null);
  const [session, setSession] = useState(null);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [completions, setCompletions] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);
  const [raffleLedger, setRaffleLedger] = useState([]);
  const [triggeredHiddenIds, setTriggeredHiddenIds] = useState([]);
  const [celebrations, setCelebrations] = useState([]);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [takeover, setTakeover] = useState(null);
  const [bingoBoard, setBingoBoard] = useState([]);

  const guestRef = useRef(null);
  const raffleEnabledRef = useRef(false);
  useEffect(() => {
    guestRef.current = guest;
    raffleEnabledRef.current = !!content.raffleEnabled;
  }, [guest, content.raffleEnabled]);

  const pushCelebration = useCallback((message, kind = 'points') => {
    const id = `cel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCelebrations((list) => [...list, { id, message, kind }]);
    setTimeout(() => {
      setCelebrations((list) => list.filter((c) => c.id !== id));
    }, 2200);
  }, []);

  const dismissTakeover = useCallback(() => setTakeover(null), []);

  const loadContent = useCallback(async () => {
    const c = await api.fetchAllContent();
    setContent(c);
  }, []);

  const loadBingo = useCallback(async () => {
    const board = await api.fetchBingoBoard();
    const free = board.find((square) => square.id === 'free');
    if (free && !free.completed) {
      await api.completeBingoSquare('free');
      setBingoBoard(await api.fetchBingoBoard());
      return;
    }
    setBingoBoard(board);
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

  // boot: restore an existing session (if any) -> content -> this
  // device's guest row. No auto sign-in anymore — a guest without a
  // session just sees the Entrance screen's sign up / log in options.
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;
    (async () => {
      try {
        const existingSession = await getGuestSession();
        setSession(existingSession);
        await loadContent();
        const g = existingSession ? await api.fetchGuestByAuthId(existingSession.user.id) : null;
        if (cancelled) return;
        setGuest(g);
        if (g) await loadGuestActivity(g.id);
        if (cancelled) return;

        unsubscribe = api.subscribeToLiveChanges((table, payload) => {
          if (['challenges', 'vendors', 'schedule_items', 'venue_areas', 'announcements', 'prizes', 'raffle_config', 'app_config'].includes(table)) {
            loadContent();
          }
          const currentGuest = guestRef.current;
          if (currentGuest && ['points_ledger', 'raffle_ledger', 'completions', 'triggered_hidden'].includes(table)) {
            loadGuestActivity(currentGuest.id);
          }
          if (currentGuest && ['bingo_rotation', 'bingo_completions'].includes(table)) {
            loadBingo().catch((err) => console.error('Bingo board failed to refresh:', err));
          }

          // Full-screen takeover: only fires on the live transition (not on
          // every reload), so it feels like a real "moment" rather than a
          // sticky modal. Priority announcements and a freshly-announced
          // raffle winner both qualify.
          if (table === 'announcements' && payload?.new) {
            const row = payload.new;
            const prev = payload.old;
            const becameLoud = row.active && row.priority && !(prev && prev.active && prev.priority);
            if (becameLoud) {
              setTakeover({ type: 'announcement', kicker: 'Announcement', title: row.title, body: row.body });
            }
          }

          if (raffleEnabledRef.current && table === 'raffle_config' && payload?.new) {
            const row = payload.new;
            const prev = payload.old;
            const justAnnounced = row.announced && !(prev && prev.announced);
            if (justAnnounced) {
              const isWinner = currentGuest && row.winner_guest_id === currentGuest.id;
              setTakeover(
                isWinner
                  ? { type: 'raffle-winner', kicker: 'Raffle drawn', title: "You won! 🎉", body: row.prize }
                  : {
                      type: 'raffle-announced',
                      kicker: 'Raffle drawn',
                      title: 'The winner has been announced!',
                      body: 'Head to Announcements to see who took it home.',
                    }
              );
            }
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

  useEffect(() => {
    if (!guest?.id) {
      setBingoBoard([]);
      return;
    }
    loadBingo().catch((err) => console.error('Bingo board failed to load:', err));
  }, [guest?.id, loadBingo]);

  const refreshContent = useCallback(() => loadContent(), [loadContent]);

  const finishNewGuest = useCallback(
    async (authUserId, displayName) => {
      const g = await api.createGuestRow(authUserId, displayName);
      setGuest(g);
      const r = await api.grantMyReward('createProfile');
      if (r?.points) pushCelebration(`+${r.points} points — welcome in!`);
      await loadGuestActivity(g.id);
      return g;
    },
    [pushCelebration, loadGuestActivity]
  );

  // Brand-new guest: create their real account, then their profile row.
  const createGuest = useCallback(
    async ({ displayName, email, password }) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        throw new Error('Account created, but email confirmation is required — check with an event host.');
      }
      setSession(data.session);
      return finishNewGuest(data.session.user.id, displayName);
    },
    [finishNewGuest]
  );

  // Returning guest signing in on a new device/browser.
  const loginGuest = useCallback(
    async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      const g = await api.fetchGuestByAuthId(data.session.user.id);
      setGuest(g);
      if (g) await loadGuestActivity(g.id);
      return g;
    },
    [loadGuestActivity]
  );

  // Edge case: a real account exists (they logged in) but never
  // finished creating their profile — just collect the name, no new
  // signup needed since the session is already there.
  const completeProfile = useCallback(
    async (displayName) => {
      if (!session) throw new Error('No active session.');
      return finishNewGuest(session.user.id, displayName);
    },
    [session, finishNewGuest]
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
      const r = await api.grantMyReward('selectRelationshipStatus');
      if (r?.points) pushCelebration(`+${r.points} points!`);
      await loadGuestActivity(next.id);
      return next;
    },
    [updateGuest, pushCelebration, loadGuestActivity]
  );

  const addProfilePhoto = useCallback(
    async (file) => {
      if (!guest) return null;
      const blob = await fileToResizedBlob(file);
      const url = await api.uploadGuestPhoto(blob, 'profile.jpg');
      const next = await updateGuest({ photoDataUrl: url });
      const r = await api.grantMyReward('profilePhoto');
      if (r?.points) pushCelebration(`+${r.points} points!`);
      await loadGuestActivity(next.id);
      return next;
    },
    [guest, updateGuest, pushCelebration, loadGuestActivity]
  );

  const uploadLook = useCallback(
    async (file) => {
      if (!guest) return null;
      const blob = await fileToResizedBlob(file);
      const url = await api.uploadGuestPhoto(blob, 'look.jpg');
      const next = await updateGuest({ lookPhotoDataUrl: url });
      const r = await api.grantMyReward('uploadLook');
      if (r?.points) {
        pushCelebration(r.entries ? `+${r.points} points + a raffle entry!` : `+${r.points} points!`, r.entries ? 'entry' : undefined);
      }
      await loadGuestActivity(next.id);
      return next;
    },
    [guest, updateGuest, pushCelebration, loadGuestActivity]
  );

  const redeemBingoCode = useCallback(
    async (squareId, code) => {
      if (!guest) throw new Error('No guest profile.');
      const result = await api.redeemBingoCode(squareId, code);
      if (result?.points) pushCelebration(`+${result.points} points — ${result.title}`);
      await Promise.all([loadGuestActivity(guest.id), loadBingo()]);
      return result;
    },
    [guest, pushCelebration, loadGuestActivity, loadBingo]
  );

  const completeBingoSquare = useCallback(
    async (squareId, photo = null) => {
      if (!guest) throw new Error('No guest profile.');
      const result = await api.completeBingoSquare(squareId, photo);
      if (result?.points) pushCelebration(`+${result.points} points — ${result.title}`);
      await Promise.all([loadGuestActivity(guest.id), loadBingo()]);
      return result;
    },
    [guest, pushCelebration, loadGuestActivity, loadBingo]
  );

  const completeChallenge = useCallback(
    async (challenge, proofPayload) => {
      if (!guest) return { status: 'error' };
      if (['secret_code', 'qr_scan', 'multiple_choice'].includes(challenge.proofType)) {
        await api.submitCheckedProof(challenge.id, proofPayload?.value ?? '');
        const r = await api.grantMyReward(`challenge:${challenge.id}`);
        pushCelebration(challenge.completionMessage || (r?.points ? `+${r.points} points!` : 'Done!'));
        await loadGuestActivity(guest.id);
        return { status: 'approved' };
      }
      const needsApproval = ['photo_upload', 'video_upload', 'short_answer', 'admin_approval'].includes(challenge.proofType);
      const status = needsApproval ? 'pending' : 'approved';
      const record = await api.submitCompletion(guest.id, challenge.id, challenge.proofType, proofPayload, status);

      if (!needsApproval) {
        const r = await api.grantMyReward(`challenge:${challenge.id}`);
        pushCelebration(challenge.completionMessage || (r?.points ? `+${r.points} points!` : 'Done!'));
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

  const buyRaffleEntry = useCallback(
    async (quantity = 1) => {
      if (!guest || quantity < 1) return { ok: false };
      const result = await api.buyRaffleEntries(quantity);
      if (!result?.ok) return { ok: false, reason: result?.reason || 'failed' };
      await loadGuestActivity(guest.id);
      pushCelebration(`+${quantity} raffle ${quantity === 1 ? 'entry' : 'entries'}!`, 'entry');
      return { ok: true };
    },
    [guest, pushCelebration, loadGuestActivity]
  );

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
    session,
    content,
    completions,
    celebrations,
    ready,
    bootError,
    takeover,
    dismissTakeover,
    refreshContent,
    createGuest,
    loginGuest,
    completeProfile,
    updateGuest,
    setRelationshipStatus,
    uploadLook,
    addProfilePhoto,
    completeChallenge,
    bingoBoard,
    redeemBingoCode,
    completeBingoSquare,
    buyRaffleEntry,
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
