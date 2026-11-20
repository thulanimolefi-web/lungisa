import nodemailer from 'nodemailer'

// Shared SMTP sender (same mailbox and host as the existing routes). Fails soft: if the
// password is not configured, nothing is sent and the caller gets false.
let transporter: nodemailer.Transporter | null = null

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.LUNGISA_EMAIL_PASSWORD || !to) return false
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.hmailplus.com', port: 587, secure: false, requireTLS: true,
      auth: { user: 'info@lungiza.co.za', pass: process.env.LUNGISA_EMAIL_PASSWORD },
      // Same as the existing routes: the mail host's certificate fails verification. Flagged for review.
      tls: { rejectUnauthorized: false },
    })
  }
  try {
    await transporter.sendMail({ from: '"Lungiza" <info@lungiza.co.za>', to, subject, html })
    return true
  } catch (e) {
    console.error('sendMail failed:', (e as Error).message)
    return false
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
