import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import * as api from '../lib/api.js';
import { fileToResizedBlob } from '../lib/image.js';

const AdminStateContext = createContext(null);

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
  huntTitle: '',
  huntBody: '',
  raffleEnabled: false,
  mapEnabled: false,
};

export function AdminStateProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [guests, setGuests] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);
  const [raffleLedger, setRaffleLedger] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [bingoStaff, setBingoStaff] = useState({ squares: [], pools: [] });
  const [spins, setSpins] = useState([]);

  const loadContent = useCallback(async () => {
    const c = await api.fetchAllContent(supabaseAdmin, { withAnswers: true });
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

  const loadBingoStaff = useCallback(async () => {
    const [board, answers] = await Promise.all([
      api.fetchBingoStaffBoard(supabaseAdmin),
      api.fetchBingoSquareAnswers(supabaseAdmin),
    ]);
    setBingoStaff({ ...board, answers: answers || {} });
  }, []);

  const loadSpins = useCallback(async () => {
    setSpins(await api.fetchRaffleSpins(supabaseAdmin));
  }, []);

  const advanceBingoPool = useCallback(async (poolId) => {
    await api.advanceBingoPool(poolId, supabaseAdmin);
    await loadBingoStaff();
  }, [loadBingoStaff]);

  const saveBingoSquare = useCallback(async (square, clues) => {
    for (const clue of clues || []) {
      await api.updateBingoVendorClue(clue.vendorId, clue.clue, clue.codeWord, supabaseAdmin);
    }
    await api.updateBingoSquare(square, supabaseAdmin);
    if (square.completionMode === 'answer' || square.completionMode === 'true_false') {
      await api.setBingoSquareAnswer(square.id, square.secretAnswer || '', supabaseAdmin);
    }
    await loadBingoStaff();
  }, [loadBingoStaff]);

  const saveVendorCode = useCallback(async (vendorId, clue, codeWord) => {
    await api.updateBingoVendorClue(vendorId, clue, codeWord, supabaseAdmin);
    await loadBingoStaff();
  }, [loadBingoStaff]);

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

  // A signed-in account only reaches the console when it is in public.admins.
  useEffect(() => {
    if (!session) {
      if (session === null) setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabaseAdmin.rpc('is_admin');
      if (cancelled) return;
      if (error || data !== true) {
        await supabaseAdmin.auth.signOut();
        if (cancelled) return;
        setIsAdmin(false);
        setSession(null);
        setAuthError('That account is not an admin.');
        return;
      }
      setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // once signed in as an admin, load everything and subscribe to live changes
  useEffect(() => {
    if (!session || !isAdmin) return;
    let unsubscribe;
    let cancelled = false;
    (async () => {
      await Promise.all([loadContent(), loadAll(), loadBingoStaff(), loadSpins()]);
      if (cancelled) return;
      unsubscribe = api.subscribeToLiveChanges(() => {
        loadContent();
        loadAll();
        loadBingoStaff();
        loadSpins();
      }, supabaseAdmin);
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [session, isAdmin, loadContent, loadAll, loadBingoStaff, loadSpins]);

  const signIn = useCallback(async (email, password) => {
    setAuthError('');
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    const { data: admin, error: adminError } = await supabaseAdmin.rpc('is_admin');
    if (adminError || admin !== true) {
      await supabaseAdmin.auth.signOut();
      const err = new Error('That account is not an admin.');
      setAuthError(err.message);
      setSession(null);
      setIsAdmin(false);
      throw err;
    }
    setIsAdmin(true);
    setSession(data.session);
    return data.session;
  }, []);

  const signOut = useCallback(async () => {
    setAuthError('');
    setIsAdmin(false);
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
      return api.uploadGuestPhoto(blob, filename, supabaseAdmin);
    },
    [session]
  );

  // ---- schedule ----
  const saveScheduleItem = useCallback(async (s) => { await api.upsertScheduleItem(s, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveScheduleOrder = useCallback(async (items) => {
    for (const item of items) await api.upsertScheduleItem(item, supabaseAdmin);
    await refreshContent();
  }, [refreshContent]);
  const deleteScheduleItemRow = useCallback(async (id) => { await api.deleteScheduleItem(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  const saveVenueArea = useCallback(async (area) => { await api.upsertVenueArea(area, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deleteVenueArea = useCallback(async (id) => { await api.deleteVenueArea(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- announcements ----
  const saveAnnouncement = useCallback(async (a) => {
    const saved = await api.upsertAnnouncement(a, supabaseAdmin);
    await refreshContent();
    return saved;
  }, [refreshContent]);
  const deleteAnnouncementItem = useCallback(async (id) => { await api.deleteAnnouncement(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- prizes ----
  const savePrize = useCallback(async (p) => { await api.upsertPrize(p, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const deletePrizeItem = useCallback(async (id) => { await api.deletePrize(id, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- raffle ----
  const saveRaffleConfig = useCallback(async (patch) => { await api.updateRaffleConfig(patch, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const closeRaffle = useCallback(() => saveRaffleConfig({ status: 'closed' }), [saveRaffleConfig]);
  const reopenRaffle = useCallback(() => saveRaffleConfig({ status: 'open' }), [saveRaffleConfig]);
  const announceWinner = useCallback(() => saveRaffleConfig({ announced: true }), [saveRaffleConfig]);
  const spinRaffle = useCallback(async () => {
    const result = await api.spinRaffle(supabaseAdmin);
    await loadSpins();
    return result;
  }, [loadSpins]);

  const undoLastSpin = useCallback(async () => {
    const result = await api.undoRaffleSpin(supabaseAdmin);
    await loadSpins();
    return result;
  }, [loadSpins]);

  const markSpinGiven = useCallback(async (spinId) => {
    await api.markRaffleSpinGiven(spinId, supabaseAdmin);
    await loadSpins();
  }, [loadSpins]);
  const resetRaffleAction = useCallback(async () => {
    await api.resetRaffle(supabaseAdmin);
    await refreshContent();
    await loadAll();
  }, [refreshContent, loadAll]);

  // ---- app config (point values / theme colors / raffle entry sources) ----
  const savePointValues = useCallback(async (pointValues) => { await api.updateAppConfig({ pointValues }, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveThemeColors = useCallback(async (themeColors) => { await api.updateAppConfig({ themeColors }, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveHuntCopy = useCallback(async (huntTitle, huntBody) => { await api.updateAppConfig({ huntTitle, huntBody }, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveRaffleEnabled = useCallback(async (raffleEnabled) => { await api.updateAppConfig({ raffleEnabled }, supabaseAdmin); await refreshContent(); }, [refreshContent]);
  const saveMapEnabled = useCallback(async (mapEnabled) => { await api.updateAppConfig({ mapEnabled }, supabaseAdmin); await refreshContent(); }, [refreshContent]);

  // ---- submissions / completions ----
  const reviewCompletion = useCallback(
    async (completionId, approve) => {
      const record = await api.reviewCompletion(completionId, approve, supabaseAdmin);
      if (approve) {
        const challenge = content.challenges.find((c) => c.id === record.challengeId);
        if (challenge) {
          await api.awardPoints(record.guestId, `challenge:${challenge.id}`, challenge.pointValue, challenge.title, supabaseAdmin);
          if (content.raffleEnabled && challenge.entryValue > 0) {
            await api.awardEntries(record.guestId, `challenge:${challenge.id}`, challenge.entryValue, challenge.title, supabaseAdmin);
          }
        }
      }
      await loadAll();
      return record;
    },
    [content.challenges, content.raffleEnabled, loadAll]
  );

  const triggerHiddenChallenge = useCallback(
    async (guestId, challengeId) => {
      await api.triggerHiddenChallenge(guestId, challengeId, supabaseAdmin);
      await loadAll();
    },
    [loadAll]
  );

  const previewRedemption = useCallback(
    ({ guestId, email } = {}) => api.previewPointRedemption({ guestId, email }, supabaseAdmin),
    []
  );

  const redeemGuestPoints = useCallback(
    async (guestId, amount, note) => {
      const result = await api.redeemGuestPoints(guestId, amount, note, supabaseAdmin);
      await loadAll();
      return result;
    },
    [loadAll]
  );

  const loadRedemptions = useCallback(() => api.fetchPointRedemptions(supabaseAdmin), []);

  const totalPoints = useMemo(() => pointsLedger.reduce((s, e) => s + e.amount, 0), [pointsLedger]);
  const totalEntries = useMemo(() => raffleLedger.reduce((s, e) => s + e.count, 0), [raffleLedger]);

  const value = {
    session,
    isAdmin,
    authReady: session !== undefined,
    authError,
    signIn,
    signOut,

    content,
    guests,
    pointsLedger,
    raffleLedger,
    completions,
    spins,
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
    saveScheduleOrder,
    deleteScheduleItemRow,
    saveVenueArea,
    deleteVenueArea,
    saveAnnouncement,
    deleteAnnouncementItem,
    savePrize,
    deletePrizeItem,

    saveRaffleConfig,
    closeRaffle,
    reopenRaffle,
    announceWinner,
    spinRaffle,
    undoLastSpin,
    markSpinGiven,
    resetRaffleAction,

    savePointValues,
    saveThemeColors,
    saveHuntCopy,
    saveRaffleEnabled,
    saveMapEnabled,

    reviewCompletion,
    triggerHiddenChallenge,
    previewRedemption,
    redeemGuestPoints,
    loadRedemptions,

    bingoStaff,
    loadBingoStaff,
    advanceBingoPool,
    saveBingoSquare,
    saveVendorCode,
  };

  return <AdminStateContext.Provider value={value}>{children}</AdminStateContext.Provider>;
}

export function useAdminState() {
  const ctx = useContext(AdminStateContext);
  if (!ctx) throw new Error('useAdminState must be used within AdminStateProvider');
  return ctx;
}
