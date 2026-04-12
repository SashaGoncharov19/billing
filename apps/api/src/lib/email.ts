import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_key')

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = options.from ?? `Entity Seven <noreply@entityseven.com>`

  if (process.env.NODE_ENV === 'development') {
    console.log(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`)
    return
  }

  await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
  })
}
