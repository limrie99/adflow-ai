import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM_EMAIL = 'AdFlow AI <noreply@adflow.ai>'

export async function sendAdReadyForReview(
  clientEmail: string,
  adTitle: string,
  clientPortalUrl: string
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `New ad ready for your review: ${adTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #111;">New Ad Ready for Review</h2>
        <p>Your agency has created a new ad for you:</p>
        <p style="font-size: 18px; font-weight: bold; color: #333;">${adTitle}</p>
        <p>Please log in to review and approve or provide feedback.</p>
        <a href="${clientPortalUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Review Ad
        </a>
      </div>
    `,
  })
}

export async function sendAdApproved(
  adminEmail: string,
  clientName: string,
  adTitle: string
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `Ad approved by ${clientName}: ${adTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #111;">Ad Approved</h2>
        <p><strong>${clientName}</strong> has approved the ad:</p>
        <p style="font-size: 18px; font-weight: bold; color: #333;">${adTitle}</p>
        <p>You can now deploy this ad to the client's ad account.</p>
      </div>
    `,
  })
}

export async function sendAdRejected(
  adminEmail: string,
  clientName: string,
  adTitle: string,
  feedback: string
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `Ad needs changes — ${clientName}: ${adTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #111;">Ad Rejected</h2>
        <p><strong>${clientName}</strong> has requested changes to:</p>
        <p style="font-size: 18px; font-weight: bold; color: #333;">${adTitle}</p>
        ${feedback ? `<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 12px;"><strong>Feedback:</strong><br/>${feedback}</div>` : ''}
      </div>
    `,
  })
}

export async function sendWelcomeEmail(
  clientEmail: string,
  password: string,
  loginUrl: string
) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: 'Welcome to AdFlow AI — Your Client Portal',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #111;">Welcome to AdFlow AI</h2>
        <p>Your agency has set up a client portal for you. Here are your login credentials:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${clientEmail}</p>
          <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please change your password after your first login.</p>
        <a href="${loginUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Log In
        </a>
      </div>
    `,
  })
}
