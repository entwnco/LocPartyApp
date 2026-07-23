// ============================================================
// DATA ACCESS LAYER — every Supabase read/write lives here, and every
// function returns the SAME shape the app already used with the
// localStorage prototype (camelCase objects). Screens never touch
// Supabase directly; they go through AppState, which goes through here.
//
// Every function takes the Supabase client as its LAST argument,
// defaulting to the guest (anonymous-session) client. Admin screens pass
// `supabaseAdmin` explicitly so writes run under the real, non-anonymous
// login that Row Level Security requires for content/admin operations.
// ============================================================

import { supabase } from './supabaseClient.js';

const UNIQUE_VIOLATION = '23505';

// ---- guests ---------------------------------------------------------

function rowToGuest(row) {
  if (!row) return null;
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    photoDataUrl: row.photo_url,
    lookPhotoDataUrl: row.look_photo_url,
    hereFor: row.here_for || '',
    relationshipStatusId: row.relationship_status_id,
    relationshipTheme: row.relationship_theme,
    createdAt: row.created_at,
  };
}

export async function fetchGuestByAuthId(authUserId, client = supabase) {
  const { data, error } = await client.from('guests').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return rowToGuest(data);
}

export async function createGuestRow(authUserId, displayName, client = supabase) {
  const { data, error } = await client
    .from('guests')
    .insert({ auth_user_id: authUserId, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return rowToGuest(data);
}

const GUEST_FIELD_MAP = {
  displayName: 'display_name',
  photoDataUrl: 'photo_url',
  lookPhotoDataUrl: 'look_photo_url',
  hereFor: 'here_for',
  relationshipStatusId: 'relationship_status_id',
  relationshipTheme: 'relationship_theme',
};

export async function updateGuestRow(guestId, patch, client = supabase) {
  const dbPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (GUEST_FIELD_MAP[key]) dbPatch[GUEST_FIELD_MAP[key]] = value;
  }
  const { data, error } = await client.from('guests').update(dbPatch).eq('id', guestId).select().single();
  if (error) throw error;
  return rowToGuest(data);
}

export async function fetchAllGuests(client = supabase) {
  const { data, error } = await client.from('guests').select('*');
  if (error) throw error;
  return data.map(rowToGuest);
}

// ---- points + raffle ledgers -----------------------------------------

export async function awardPoints(guestId, sourceKey, amount, label, client = supabase) {
  const { error } = await client.from('points_ledger').insert({ guest_id: guestId, source_key: sourceKey, amount, label });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { awarded: false };
    throw error;
  }
  return { awarded: true };
}

export async function awardEntries(guestId, sourceKey, count, label, client = supabase) {
  const { error } = await client.from('raffle_ledger').insert({ guest_id: guestId, source_key: sourceKey, count, label });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { awarded: false };
    throw error;
  }
  return { awarded: true };
}

function rowToLedgerEntry(row, countKey) {
  return {
    id: row.id,
    guestId: row.guest_id,
    sourceKey: row.source_key,
    amount: row.amount,
    count: row[countKey],
    label: row.label,
    timestamp: row.created_at,
  };
}

export async function fetchGuestPoints(guestId, client = supabase) {
  const { data, error } = await client
    .from('points_ledger')
    .select('*')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((r) => rowToLedgerEntry(r, 'amount'));
}

export async function fetchGuestEntries(guestId, client = supabase) {
  const { data, error } = await client
    .from('raffle_ledger')
    .select('*')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((r) => rowToLedgerEntry(r, 'count'));
}

/** Admin-only: every guest's ledger rows, for live totals. Pass supabaseAdmin. */
export async function fetchAllPoints(client = supabase) {
  const { data, error } = await client.from('points_ledger').select('*');
  if (error) throw error;
  return data.map((r) => rowToLedgerEntry(r, 'amount'));
}

export async function fetchAllEntries(client = supabase) {
  const { data, error } = await client.from('raffle_ledger').select('*');
  if (error) throw error;
  return data.map((r) => rowToLedgerEntry(r, 'count'));
}

// ---- challenges -------------------------------------------------------

function rowToChallenge(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    vendorId: row.vendor_id,
    startTime: row.start_time,
    endTime: row.end_time,
    pointValue: row.point_value,
    entryValue: row.entry_value,
    proofType: row.proof_type,
    unlock: row.unlock || { type: 'immediate' },
    completionMessage: row.completion_message,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

function challengeToRow(c) {
  return {
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    vendor_id: c.vendorId || null,
    start_time: c.startTime || null,
    end_time: c.endTime || null,
    point_value: c.pointValue,
    entry_value: c.entryValue,
    proof_type: c.proofType,
    unlock: c.unlock,
    completion_message: c.completionMessage,
    active: c.active,
    sort_order: c.sortOrder ?? 0,
  };
}

export async function fetchChallenges(client = supabase) {
  const { data, error } = await client.from('challenges').select('*').order('sort_order');
  if (error) throw error;
  return data.map(rowToChallenge);
}

export async function upsertChallenge(c, client = supabase) {
  const row = challengeToRow(c);
  const isNew = !c.id || String(c.id).startsWith('ch_');
  const { data, error } = isNew
    ? await client.from('challenges').insert(row).select().single()
    : await client.from('challenges').update(row).eq('id', c.id).select().single();
  if (error) throw error;
  return rowToChallenge(data);
}

export async function deleteChallenge(id, client = supabase) {
  const { error } = await client.from('challenges').delete().eq('id', id);
  if (error) throw error;
}

// ---- vendors ------------------------------------------------------------

function rowToVendor(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    location: row.location,
    logoUrl: row.logo_url,
    isFeatured: row.is_featured,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

function vendorToRow(v) {
  return {
    name: v.name,
    category: v.category,
    description: v.description,
    location: v.location,
    logo_url: v.logoUrl ?? null,
    is_featured: v.isFeatured,
    active: v.active,
    sort_order: v.sortOrder ?? 0,
  };
}

export async function fetchVendors(client = supabase) {
  const { data, error } = await client.from('vendors').select('*').order('sort_order');
  if (error) throw error;
  return data.map(rowToVendor);
}

export async function upsertVendor(v, client = supabase) {
  const row = vendorToRow(v);
  const isNew = !v.id || String(v.id).startsWith('vendor_') || String(v.id).startsWith('vendor-');
  const { data, error } = isNew
    ? await client.from('vendors').insert(row).select().single()
    : await client.from('vendors').update(row).eq('id', v.id).select().single();
  if (error) throw error;
  return rowToVendor(data);
}

export async function deleteVendor(id, client = supabase) {
  const { error } = await client.from('vendors').delete().eq('id', id);
  if (error) throw error;
}

// ---- schedule items -------------------------------------------------------

function rowToSchedule(row) {
  return { id: row.id, time: row.time_label, title: row.title, description: row.description, active: row.active, sortOrder: row.sort_order };
}

function scheduleToRow(s) {
  return { time_label: s.time, title: s.title, description: s.description, active: s.active, sort_order: s.sortOrder ?? 0 };
}

export async function fetchSchedule(client = supabase) {
  const { data, error } = await client.from('schedule_items').select('*').order('sort_order');
  if (error) throw error;
  return data.map(rowToSchedule);
}

export async function upsertScheduleItem(s, client = supabase) {
  const row = scheduleToRow(s);
  const isNew = !s.id || String(s.id).startsWith('sched_') || String(s.id).startsWith('sched-');
  const { data, error } = isNew
    ? await client.from('schedule_items').insert(row).select().single()
    : await client.from('schedule_items').update(row).eq('id', s.id).select().single();
  if (error) throw error;
  return rowToSchedule(data);
}

export async function deleteScheduleItem(id, client = supabase) {
  const { error } = await client.from('schedule_items').delete().eq('id', id);
  if (error) throw error;
}

// ---- announcements -------------------------------------------------------

function rowToAnnouncement(row) {
  return { id: row.id, title: row.title, body: row.body, active: row.active, priority: row.priority, timestamp: row.created_at };
}

function announcementToRow(a) {
  return { title: a.title, body: a.body, active: a.active, priority: !!a.priority };
}

export async function fetchAnnouncements(client = supabase) {
  const { data, error } = await client.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToAnnouncement);
}

export async function upsertAnnouncement(a, client = supabase) {
  const row = announcementToRow(a);
  const isNew = !a.id || String(a.id).startsWith('ann_') || String(a.id).startsWith('ann-');
  const { data, error } = isNew
    ? await client.from('announcements').insert(row).select().single()
    : await client.from('announcements').update(row).eq('id', a.id).select().single();
  if (error) throw error;
  return rowToAnnouncement(data);
}

export async function deleteAnnouncement(id, client = supabase) {
  const { error } = await client.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

// ---- prizes ---------------------------------------------------------------

function rowToPrize(row) {
  return { id: row.id, title: row.title, description: row.description, active: row.active, sortOrder: row.sort_order };
}

function prizeToRow(p) {
  return { title: p.title, description: p.description, active: p.active, sort_order: p.sortOrder ?? 0 };
}

export async function fetchPrizes(client = supabase) {
  const { data, error } = await client.from('prizes').select('*').order('sort_order');
  if (error) throw error;
  return data.map(rowToPrize);
}

export async function upsertPrize(p, client = supabase) {
  const row = prizeToRow(p);
  const isNew = !p.id || String(p.id).startsWith('prize_') || String(p.id).startsWith('prize-');
  const { data, error } = isNew
    ? await client.from('prizes').insert(row).select().single()
    : await client.from('prizes').update(row).eq('id', p.id).select().single();
  if (error) throw error;
  return rowToPrize(data);
}

export async function deletePrize(id, client = supabase) {
  const { error } = await client.from('prizes').delete().eq('id', id);
  if (error) throw error;
}

// ---- raffle config (singleton) ---------------------------------------------

function rowToRaffleConfig(row) {
  return {
    rules: row.rules,
    prize: row.prize,
    deadline: row.deadline,
    drawingTime: row.drawing_time,
    eligibility: row.eligibility,
    contactMethod: row.contact_method,
    mustBePresent: row.must_be_present,
    status: row.status,
    winnerEntryId: row.winner_entry_id,
    winnerGuestId: row.winner_guest_id,
    announced: row.announced,
    drawnAt: row.drawn_at,
  };
}

export async function fetchRaffleConfig(client = supabase) {
  const { data, error } = await client.from('raffle_config').select('*').eq('id', 1).single();
  if (error) throw error;
  return rowToRaffleConfig(data);
}

export async function updateRaffleConfig(patch, client = supabase) {
  const dbPatch = {};
  if ('rules' in patch) dbPatch.rules = patch.rules;
  if ('prize' in patch) dbPatch.prize = patch.prize;
  if ('deadline' in patch) dbPatch.deadline = patch.deadline || null;
  if ('drawingTime' in patch) dbPatch.drawing_time = patch.drawingTime || null;
  if ('eligibility' in patch) dbPatch.eligibility = patch.eligibility;
  if ('contactMethod' in patch) dbPatch.contact_method = patch.contactMethod;
  if ('mustBePresent' in patch) dbPatch.must_be_present = patch.mustBePresent;
  if ('status' in patch) dbPatch.status = patch.status;
  if ('announced' in patch) dbPatch.announced = patch.announced;
  const { data, error } = await client.from('raffle_config').update(dbPatch).eq('id', 1).select().single();
  if (error) throw error;
  return rowToRaffleConfig(data);
}

export async function drawRaffleWinner(client = supabase) {
  const { data, error } = await client.rpc('draw_raffle_winner');
  if (error) throw error;
  return data?.[0] || null;
}

// Privacy-safe leaderboard — the `get_leaderboard` Postgres function only
// ever returns display_name + total points (never relationship status,
// photos, or anything else guests share privately), so this is safe to
// call from any guest's anonymous session.
export async function fetchLeaderboard(limit = 100, client = supabase) {
  const { data, error } = await client.rpc('get_leaderboard', { limit_count: limit });
  if (error) throw error;
  return (data || []).map((row) => ({
    guestId: row.guest_id,
    displayName: row.display_name,
    totalPoints: row.total_points,
    rank: row.rank,
  }));
}

export async function resetRaffle(client = supabase) {
  const { error: e1 } = await client.from('raffle_ledger').delete().neq('guest_id', '00000000-0000-0000-0000-000000000000');
  if (e1) throw e1;
  const { data, error } = await client
    .from('raffle_config')
    .update({ status: 'open', winner_guest_id: null, winner_entry_id: null, announced: false, drawn_at: null })
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return rowToRaffleConfig(data);
}

// ---- app config (point values / raffle sources / theme colors) --------------

export async function fetchAppConfig(client = supabase) {
  const { data, error } = await client.from('app_config').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    pointValues: data.point_values,
    raffleEntrySources: data.raffle_entry_sources,
    themeColors: data.theme_colors,
    huntTitle: data.hunt_title,
    huntBody: data.hunt_body,
  };
}

export async function updateAppConfig(patch, client = supabase) {
  const dbPatch = {};
  if ('pointValues' in patch) dbPatch.point_values = patch.pointValues;
  if ('raffleEntrySources' in patch) dbPatch.raffle_entry_sources = patch.raffleEntrySources;
  if ('themeColors' in patch) dbPatch.theme_colors = patch.themeColors;
  if ('huntTitle' in patch) dbPatch.hunt_title = patch.huntTitle;
  if ('huntBody' in patch) dbPatch.hunt_body = patch.huntBody;
  const { data, error } = await client.from('app_config').update(dbPatch).eq('id', 1).select().single();
  if (error) throw error;
  return {
    pointValues: data.point_values,
    raffleEntrySources: data.raffle_entry_sources,
    themeColors: data.theme_colors,
    huntTitle: data.hunt_title,
    huntBody: data.hunt_body,
  };
}

// ---- completions / submissions ----------------------------------------------

function rowToCompletion(row) {
  return {
    id: row.id,
    guestId: row.guest_id,
    challengeId: row.challenge_id,
    proofType: row.proof_type,
    proofPayload: row.proof_payload,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function fetchGuestCompletions(guestId, client = supabase) {
  const { data, error } = await client.from('completions').select('*').eq('guest_id', guestId);
  if (error) throw error;
  return data.map(rowToCompletion);
}

export async function fetchAllCompletions(client = supabase) {
  const { data, error } = await client.from('completions').select('*');
  if (error) throw error;
  return data.map(rowToCompletion);
}

export async function submitCompletion(guestId, challengeId, proofType, proofPayload, status, client = supabase) {
  const { data, error } = await client
    .from('completions')
    .upsert(
      { guest_id: guestId, challenge_id: challengeId, proof_type: proofType, proof_payload: proofPayload, status, submitted_at: new Date().toISOString(), reviewed_at: null },
      { onConflict: 'guest_id,challenge_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return rowToCompletion(data);
}

export async function reviewCompletion(completionId, approve, client = supabase) {
  const { data, error } = await client
    .from('completions')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', completionId)
    .select()
    .single();
  if (error) throw error;
  return rowToCompletion(data);
}

// ---- hidden-challenge triggers ------------------------------------------------

export async function fetchTriggeredHidden(guestId, client = supabase) {
  const { data, error } = await client.from('triggered_hidden').select('challenge_id').eq('guest_id', guestId);
  if (error) throw error;
  return data.map((r) => r.challenge_id);
}

export async function triggerHiddenChallenge(guestId, challengeId, client = supabase) {
  const { error } = await client.from('triggered_hidden').insert({ guest_id: guestId, challenge_id: challengeId });
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

// ---- combined content fetch (matches the old localStorage `content` shape) ---

export async function fetchAllContent(client = supabase) {
  const [challenges, vendors, scheduleItems, announcements, prizes, raffleConfig, appConfig] = await Promise.all([
    fetchChallenges(client),
    fetchVendors(client),
    fetchSchedule(client),
    fetchAnnouncements(client),
    fetchPrizes(client),
    fetchRaffleConfig(client),
    fetchAppConfig(client),
  ]);
  return {
    challenges,
    vendors,
    scheduleItems,
    announcements,
    prizes,
    raffleConfig,
    pointValues: appConfig.pointValues,
    raffleEntrySources: appConfig.raffleEntrySources,
    themeColors: appConfig.themeColors,
    huntTitle: appConfig.huntTitle,
    huntBody: appConfig.huntBody,
  };
}

// ---- photo uploads (real storage, not base64-in-a-column) ---------------------

// Used by the admin panel only (vendor logos) via the supabaseAdmin
// client, which has always uploaded to storage reliably.
export async function uploadPhoto(authUserId, blob, filename, client = supabase) {
  const path = `${authUserId}/${filename}`;
  const { error } = await client.storage.from('party-photos').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = client.storage.from('party-photos').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // reader.result is a data: URL — strip the "data:...;base64," prefix.
      const base64 = String(reader.result).split(',')[1] || '';
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

// Guests upload through this instead — direct guest-to-storage writes
// were unreliable on this project (see upload-photo edge function for
// the full story). This calls a server-side function that verifies the
// guest's own login token and does the actual write with full access,
// scoped to that guest's own folder only.
export async function uploadGuestPhoto(blob, filename, client = supabase) {
  const dataBase64 = await blobToBase64(blob);
  const { data, error } = await client.functions.invoke('upload-photo', {
    body: { filename, contentType: blob.type || 'image/jpeg', dataBase64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.publicUrl;
}

// ---- realtime ---------------------------------------------------------------

/**
 * One subscription for everything that should feel "live": content edits
 * from admin, new points/entries anywhere, new/reviewed submissions, and
 * the raffle status. Fires `onChange` with the table name on any event —
 * callers just refetch the relevant slice, which is cheap at party scale.
 */
export function subscribeToLiveChanges(onChange, client = supabase) {
  const tables = [
    'challenges',
    'vendors',
    'schedule_items',
    'announcements',
    'prizes',
    'raffle_config',
    'app_config',
    'points_ledger',
    'raffle_ledger',
    'completions',
    'triggered_hidden',
  ];
  const channel = client.channel('loc-party-live');
  tables.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => onChange(table, payload));
  });
  channel.subscribe();
  return () => client.removeChannel(channel);
}
