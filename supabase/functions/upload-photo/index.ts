import { createClient } from 'jsr:@supabase/supabase-js@2'

// Guests upload their profile photo / "look" photo through this function
// instead of writing to Supabase Storage directly from their phone. Direct
// guest-to-storage uploads were unreliable on this project (every guest
// upload attempt failed a storage permission check, regardless of how the
// guest was logged in) -- this function does the actual write with full
// (service-role) access instead, after verifying who the caller is from
// their own login token. It only ever writes to that caller's own folder,
// and only accepts the two known filenames, so one guest can never
// overwrite another guest's photo.

const ALLOWED_FILENAMES = ['profile.jpg', 'look.jpg']

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller's own token to find out who they really are --
    // never trust a user id sent in the request body.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = userData.user.id

    const body = await req.json()
    const { filename, contentType, dataBase64 } = body || {}

    if (!filename || !ALLOWED_FILENAMES.includes(filename)) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing image data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let bytes: Uint8Array
    try {
      const binary = atob(dataBase64)
      bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    } catch {
      return new Response(JSON.stringify({ error: 'Image data was not valid base64' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Reasonable upper bound so this can't be abused to store huge blobs.
    if (bytes.byteLength > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image is too large (max 8MB).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const path = `${userId}/${filename}`
    const { error: uploadError } = await adminClient.storage.from('party-photos').upload(path, bytes, {
      upsert: true,
      contentType: contentType || 'image/jpeg',
    })
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: urlData } = adminClient.storage.from('party-photos').getPublicUrl(path)
    return new Response(JSON.stringify({ publicUrl: `${urlData.publicUrl}?v=${Date.now()}` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
