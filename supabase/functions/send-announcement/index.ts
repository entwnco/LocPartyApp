import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPush } from './webpush.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function envValue(text: string, name: string) {
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0 || trimmed.slice(0, eq) !== name) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return ''
}

async function vapidConfig() {
  let publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  let privateRaw = Deno.env.get('VAPID_PRIVATE_JWK') || ''
  let subject = Deno.env.get('VAPID_SUBJECT') || ''
  if (!publicKey || !privateRaw) {
    try {
      const text = await Deno.readTextFile(new URL('./.env', import.meta.url))
      publicKey = publicKey || envValue(text, 'VAPID_PUBLIC_KEY')
      privateRaw = privateRaw || envValue(text, 'VAPID_PRIVATE_JWK')
      subject = subject || envValue(text, 'VAPID_SUBJECT')
    } catch {
      // Hosted projects set these as function secrets instead of a file.
    }
  }
  return {
    publicKey,
    privateRaw,
    subject: subject || 'mailto:admin@locparty.test',
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { publicKey: vapidPublicKey, privateRaw: vapidPrivateRaw, subject } = await vapidConfig()
    if (!vapidPublicKey || !vapidPrivateRaw) return json({ error: 'Push is not configured' }, 500)

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await caller.auth.getUser()
    if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: adminRow } = await admin
      .from('admins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!adminRow) return json({ error: 'Not an admin' }, 403)

    const { announcementId } = await req.json()
    if (!announcementId) return json({ error: 'Missing announcement' }, 400)

    const { data: announcement, error: announcementError } = await admin
      .from('announcements')
      .select('id, title, body, active')
      .eq('id', announcementId)
      .maybeSingle()
    if (announcementError) throw announcementError
    if (!announcement?.active) return json({ sent: 0, removed: 0 })

    const { data: subscriptions, error: subscriptionError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
    if (subscriptionError) throw subscriptionError

    const privateJwk = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(vapidPrivateRaw), (char) => char.charCodeAt(0)),
    ))
    const payload = {
      title: announcement.title,
      body: (announcement.body || '').slice(0, 180),
      url: '/announcements',
    }

    let sent = 0
    const stale: string[] = []
    for (const subscription of subscriptions || []) {
      const response = await sendPush({
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth_key,
        payload,
        vapidPublicKey,
        vapidPrivateJwk: privateJwk,
        subject,
      })
      if (response.status === 404 || response.status === 410) stale.push(subscription.id)
      else if (response.ok) sent += 1
      else console.error('Push failed', response.status, await response.text())
    }

    if (stale.length) {
      await admin.from('push_subscriptions').delete().in('id', stale)
    }

    return json({ sent, removed: stale.length })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Push failed' }, 500)
  }
})
