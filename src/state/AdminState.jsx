import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import * as api from '../lib/api.js';
import { fileToResizedBlob } from '../lib/image.js';

const AdminStateContext = createContext(null);

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

export function AdminStateProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [authError, setAuthError] = useState('');
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [guests, setGuests] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);
  const [raffleLedger, setRaffleLedger] = useState([]);
  const [completions, setCompletions] = useState([]);

  const loadContent = useCallback(async () => {
    const c = await api.fetchAllContent(supabaseAdmin);
    setContent(c);
  }, []);

  const loadAll = useCallback(async () => {
    const [g, pts, ent, comps] = await Promise.all([
      api.fetchAllGuests(supabaseAdmin),
      api.fetchAllPoints(supabaseAdmin),
      api.fetchAllEntries(supabaseAdmin),
      api.fetchAllCompletions(supabaseAdmin),
    ]);
    setGuests(g);
    setPointsLedger(pts);
    setRaffleLedger(ent);
    setCompletions(comps);
  }, []);

  const refreshContent = useCallback(() => loadContent(), [loadContent]);
  const refreshAll = useCallback(() => Promise.all([loadContent(), loadAll()]), [loadContent, loadAll]);

  // boot: check for an existing admin session, then react to sign-in/out
  useEffect(() => {
    let authSub;

    (async () => {
      const { data } = await supabaseAdmin.auth.getSession();
      setSession(data.session || null);

      const { data: listener } = supabaseAdmin.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });
      authSub = listener;
    })();

    return () => {
      if (authSub) authSub.subscription.unsubscribe();
    };
  }, []);

  // once signed in, load everything and subscribe to live changes
  useEffect(() => {
    if (!session) return;
    let unsubscribe;
    let cancelled = false;
    (async () => {
      await Promise.all([loadContent(), loadAll()]);
      if (cancelled) return;
      unsubscribe = api.subscribeToLiveChanges(() => {
        loadContent();
        loadAll();
      }, supabaseAdmin);
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [session, loadContent, loadAll]);

  const signIn = useCallback(async (email, password) => {
    setAuthError('');
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    setSession(data.session);
    return data.session;
  }, []);

  const signUp = useCallback(async (email, password) => {
    setAuthError('');
    const { data, error } = await supabaseAdmin.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    if (data.session) setSession(data.session);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabaseAdmin.auth.signOut();
    setSession(null);
  }, []);

  // ---- challenges ----
  const saveChallenge = useCallback(async (c) => { await api.upsertChallenge(c, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deleteChallengeItem = useCallback(async (id) => { await api.deleteChallenge(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- vendors ----
  const saveVendor = useCallback(async (v) => { await api.upsertVendor(v, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deleteVendorItem = useCallback(async (id) => { await api.deleteVendor(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const uploadVendorLogo = useCallback(
    async (file, vendorId) => {
      if (!session) return null;
      const blob = await fileToResizedBlob(file, 800, 0.85);
      const filename = `vendor-${vendorId || Date.now()}.jpg`;
      return api.uploadPhoto(session.user.id, blob, filename, supabaseAdmin);
    },
    [session]
  );

  // ---- schedule ----
  const saveScheduleItem = useCallback(async (s) => { await api.upsertScheduleItem(s, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deleteScheduleItemRow = useCallback(async (id) => { await api.deleteScheduleItem(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- announcements ----
  const saveAnnouncement = useCallback(async (a) => { await api.upsertAnnouncement(a, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deleteAnnouncementItem = useCallback(async (id) => { await api.deleteAnnouncement(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- prizes ----
  const savePrize = useCallback(async (p) => { await api.upsertPrize(p, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deletePrizeItem = useCallback(async (id) => { await api.deletePrize(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- raffle ----
  const saveRaffleConfig = useCallback(async (patch) => { await api.updateRaffleConfig(patch, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const closeRaffle = useCallback(() => saveRaffleConfig({ status: 'closed' }), [saveRaffleConfig]);
  const reopenRaffle = useCallback(() => saveRaffleConfig({ status: 'open' }), [saveRaffleConfig]);
  const announceWinner = useCallback(() => saveRaffleConfig({ announced: true }), [saveRaffleConfig]);
  const drawWinner = useCallback(async () => {
    const result = await api.drawRaffleWinner(supabaseAdmin);
    await refreshContent();
    return result;
  }, [refreshContent]);
  const resetRaffleAction = useCallback(async () => {
    await api.resetRaffle(supabaseAdmin);
    await refreshContent();
    await loadAll();
  }, [refreshContent, loadAll]);

  // ---- app config (point values / theme colors / raffle entry sources) ----
  const savePointValues = useCallback(async (pointValues) => { await api.updateAppConfig({ pointValues }, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveThemeColors = useCallback(async (themeColors) => { await api.updateAppConfig({ themeColors }, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- submissions / completions ----
  const reviewCompletion = useCallback(
    async (completionId, approve) => {
      const record = await api.reviewCompletion(completionId, approve, supabaseAdmin);
      if (approve) {
        const challenge = content.challenges.find((c) => c.id === record.challengeId);
        if (challenge) {
          await api.awardPoints(record.guestId, `challenge:${challenge.id}`, challenge.pointValue, challenge.title, supabaseAdmin);
          if (challenge.entryValue > 0) {
            await api.awardEntries(record.guestId, `challenge:${challenge.id}`, challenge.entryValue, challenge.title, supabaseAdmin);
          }
        }
      }
      await loadAll();
      return record;
    },
    [content.challenges, loadAll]
  );

  const triggerHiddenChallenge = useCallback(
    async (guestId, challengeId) => {
      await api.triggerHiddenChallenge(guestId, challengeId, supabaseAdmin);
      await loadAll();
    },
    [loadAll]
  );

  const totalPoints = useMemo(() => pointsLedger.reduce((s, e) => s + e.amount, 0), [pointsLedger]);
  const totalEntries = useMemo(() => raffleLedger.reduce((s, e) => s + e.count, 0), [raffleLedger]);

  const value = {
    session,
    authReady: session !== undefined,
    authError,
    signIn,
    signUp,
    signOut,

    content,
    guests,
    pointsLedger,
    raffleLedger,
    completions,
    totalPoints,
    totalEntries,

    refreshContent,
    refreshAll,

    saveChallenge,
    deleteChallengeItem,
    saveVendor,
    deleteVendorItem,
    uploadVendorLogo,
    saveScheduleItem,
    deleteScheduleItemRow,
    saveAnnouncement,
    deleteAnnouncementItem,
    savePrize,
    deletePrizeItem,

    saveRaffleConfig,
    closeRaffle,
    reopenRaffle,
    announceWinner,
    drawWinner,
    resetRaffleAction,

    savePointValues,
    saveThemeColors,

    reviewCompletion,
    triggerHiddenChallenge,
  };

  return <AdminStateContext.Provider value={value}>{children}</AdminStateContext.Provider>;
}

export function useAdminState() {
  const ctx = useContext(AdminStateContext);
  if (!ctx) throw new Error('useAdminState must be used within AdminStateProvider');
  return ctx;
}
