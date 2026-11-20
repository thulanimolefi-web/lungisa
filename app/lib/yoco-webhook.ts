import crypto from 'crypto'

// Yoco signs webhooks with the Standard Webhooks scheme (per Yoco docs, "Verifying the events"):
// signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256 with the
// base64-decoded part of the `whsec_...` secret; header `webhook-signature` = "v1,<base64> v1,<base64>".
export function verifyYocoWebhook(rawBody: string, headers: Headers, secret: string | undefined, toleranceSec = 180): boolean {
  if (!secret || !secret.startsWith('whsec_')) return false
  const id = headers.get('webhook-id')
  const ts = headers.get('webhook-timestamp')
  const sigHeader = headers.get('webhook-signature')
  if (!id || !ts || !sigHeader) return false
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > toleranceSec) return false
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest('base64')
  const exp = Buffer.from(expected)
  return sigHeader.split(' ').some(entry => {
    const [ver, sig] = entry.split(',')
    if (ver !== 'v1' || !sig) return false
    const got = Buffer.from(sig)
    return got.length === exp.length && crypto.timingSafeEqual(got, exp)
  })
}
