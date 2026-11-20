// One-time codes for receiver-confirmed approvals (BR-2.1, rule R4).
// Channel today: email through the existing mailbox. SMS needs a provider (owner decision);
// sendSms() returns false until SMS_PROVIDER is configured, and the link page then offers email.
import crypto from 'crypto'
import { db, hashToken, newToken } from './jobrecord-server'
import { sendMail, escapeHtml } from './mailer'

const CODE_TTL_MIN = 10
const SESSION_TTL_MIN = 30
const MAX_ATTEMPTS = 5

async function sendSms(_to: string, _text: string): Promise<boolean> {
  return false // OWNER DECISION: pick an SMS provider. Until then, email only.
}

export async function startOtp(linkId: string, channel: 'email' | 'sms', destination: string) {
  const dest = destination.trim().toLowerCase()
  if (channel === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) return { ok: false, error: 'Enter a valid email address' }
  // Simple rate limit: at most 3 codes per link per 15 minutes
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await db().from('otp_challenges').select('id', { count: 'exact', head: true }).eq('link_id', linkId).gte('created_at', since)
  if ((count || 0) >= 3) return { ok: false, error: 'Too many codes requested. Try again in 15 minutes.' }
  const code = String(crypto.randomInt(100000, 1000000))
  const { data, error } = await db().from('otp_challenges').insert({
    link_id: linkId, channel, destination: dest, code_hash: hashToken(code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString(),
  }).select('id').single()
  if (error) return { ok: false, error: 'Could not start verification' }
  const text = `Your Lungiza code is ${code}. It expires in ${CODE_TTL_MIN} minutes. If you did not ask for it, ignore this message.`
  const sent = channel === 'sms' ? await sendSms(dest, text)
    : await sendMail(dest, 'Your Lungiza confirmation code', `<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(text)}</p>`)
  if (!sent) return { ok: false, error: channel === 'sms' ? 'SMS codes are not available yet. Use email.' : 'Could not send the email. Check the address.' }
  return { ok: true, challengeId: (data as any).id }
}

export async function verifyOtp(linkId: string, challengeId: string, code: string) {
  const { data } = await db().from('otp_challenges').select('*').eq('id', challengeId).eq('link_id', linkId).maybeSingle()
  const c: any = data
  if (!c || c.verified_at) return { ok: false, error: 'Code not found. Request a new one.' }
  if (new Date(c.expires_at) < new Date()) return { ok: false, error: 'Code expired. Request a new one.' }
  if (c.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts. Request a new code.' }
  await db().from('otp_challenges').update({ attempts: c.attempts + 1 }).eq('id', c.id)
  const a = Buffer.from(hashToken(String(code).trim())), b = Buffer.from(c.code_hash)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: 'Wrong code' }
  const session = newToken()
  await db().from('otp_challenges').update({ verified_at: new Date().toISOString(), session_hash: hashToken(session),
    expires_at: new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000).toISOString() }).eq('id', c.id)
  return { ok: true, session, destination: c.destination }
}

/** Returns the verified challenge for an OTP session token, or null. */
export async function checkOtpSession(linkId: string, session: string | undefined | null) {
  if (!session) return null
  const { data } = await db().from('otp_challenges').select('*').eq('link_id', linkId).eq('session_hash', hashToken(session)).maybeSingle()
  const c: any = data
  if (!c || !c.verified_at || new Date(c.expires_at) < new Date()) return null
  return c
}
