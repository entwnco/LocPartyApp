// Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID). Uses Web Crypto so the
// edge function and a Node self-test can share it.

function bytesToB64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function deriveKeys(userPublicKey, authSecret, localPublicKey, localPrivateKey, salt) {
  const remoteKey = await crypto.subtle.importKey(
    'raw',
    userPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: remoteKey }, localPrivateKey, 256),
  );
  const info = concat([
    new TextEncoder().encode('WebPush: info\0'),
    userPublicKey,
    localPublicKey,
  ]);
  const ikm = await hkdf(authSecret, shared, info, 32);
  const contentKey = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);
  return { contentKey, nonce };
}

export async function encryptBody(payloadText, userPublicB64, authB64) {
  const userPublicKey = b64urlToBytes(userPublicB64);
  const authSecret = b64urlToBytes(authB64);
  const localPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', localPair.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const { contentKey, nonce } = await deriveKeys(
    userPublicKey,
    authSecret,
    localPublicKey,
    localPair.privateKey,
    salt,
  );
  const plain = new TextEncoder().encode(payloadText);
  const padded = new Uint8Array(plain.length + 1);
  padded.set(plain);
  padded[plain.length] = 2;
  const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded),
  );
  const recordSize = 4096;
  const header = new Uint8Array(21 + localPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);
  return concat([header, ciphertext]);
}

async function vapidJwt(endpoint, privateJwk, subject) {
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  })));
  const key = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signed = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  );
  return `${header}.${payload}.${bytesToB64url(signed)}`;
}

export async function sendPush({ endpoint, p256dh, auth, payload, vapidPublicKey, vapidPrivateJwk, subject }) {
  const body = await encryptBody(JSON.stringify(payload), p256dh, auth);
  const token = await vapidJwt(endpoint, vapidPrivateJwk, subject);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '43200',
    },
    body,
  });
}
