import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Fails loudly in dev rather than silently hitting the wrong project.
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — check your .env file.');
}

// Two separate clients with separate session storage keys, so opening the
// admin console on the SAME phone/laptop that's also a guest never
// overwrites that guest's anonymous session (and vice versa).
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'sb-loc-party-guest' },
});

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'sb-loc-party-admin' },
});

/**
 * Every guest device gets its own anonymous Supabase Auth session — no
 * email, no password, nothing for the guest to do. supabase-js persists
 * the session in localStorage automatically, so reopening the app (or
 * relaunching the installed PWA) restores the same guest identity.
 * Admins sign in with a real email/password instead (see AdminLogin),
 * through the separate `supabaseAdmin` client above.
 */
export async function ensureGuestSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signInData.session;
}
