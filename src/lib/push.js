import { supabase } from './supabaseClient.js';

// Public half of the announcement push key. The private half stays on the
// send-announcement function. Both halves were generated together.
export const VAPID_PUBLIC_KEY = 'BNYWANDAv9RJavd14qklegcCVR0E0BncITP19Cv6_7KM0C9lYaion9SJNdn-0R5Sb07Wm5c-CMHGVGNpt0jEhc8';

function urlBase64ToUint8Array(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function alertSupport() {
  if (typeof window === 'undefined') return { supported: false, needsInstall: false, permission: 'default' };
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return {
    supported,
    needsInstall: ios && !standalone,
    permission: supported ? Notification.permission : 'default',
  };
}

async function storeSubscription(subscription) {
  const json = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });
  if (error) throw error;
}

export async function enableAlerts() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  await syncAlerts();
  return permission;
}

export async function syncAlerts() {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await storeSubscription(subscription);
}
