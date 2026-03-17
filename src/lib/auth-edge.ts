/**
 * Edge-compatible HMAC signing/verification for session cookies.
 * Uses the Web Crypto API (available in Edge Runtime).
 */

const SESSION_COOKIE = 'adflow-session'
const encoder = new TextEncoder()

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer as ArrayBuffer
}

export interface SessionPayload {
  userId: string
  role: string
  exp: number // unix timestamp
}

/**
 * Create a signed session value: base64(json).hmac_hex
 */
export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const json = JSON.stringify(payload)
  const data = encoder.encode(json)
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const b64 = btoa(json)
  return `${b64}.${bufToHex(sig)}`
}

/**
 * Verify and decode a signed session value.
 * Returns null if invalid, expired, or tampered.
 */
export async function verifySession(cookie: string, secret: string): Promise<SessionPayload | null> {
  try {
    const dotIdx = cookie.lastIndexOf('.')
    if (dotIdx === -1) return null

    const b64 = cookie.substring(0, dotIdx)
    const sigHex = cookie.substring(dotIdx + 1)

    const json = atob(b64)
    const data = encoder.encode(json)
    const key = await getKey(secret)
    const valid = await crypto.subtle.verify('HMAC', key, hexToBuf(sigHex), data)

    if (!valid) return null

    const payload: SessionPayload = JSON.parse(json)

    // Check expiry
    if (payload.exp < Date.now() / 1000) return null

    return payload
  } catch {
    return null
  }
}

export { SESSION_COOKIE }
