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
 * Guests create a real (email + password) account — no anonymous
 * sign-in. This is required for two reasons: it's the only way a guest
 * can recover their profile if they switch devices or clear their
 * browser, and (just as important) anonymous logins turned out to be
 * unreliable for photo uploads on this project, while real accounts
 * have always worked fine. supabase-js persists the session in
 * localStorage automatically, so reopening the app (or relaunching the
 * installed PWA) restores the same guest identity without needing to
 * log in again.
 */
export async function getGuestSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
