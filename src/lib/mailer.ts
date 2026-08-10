import nodemailer from "nodemailer";

/**
 * Custom transactional emails (organisation review notifications) are
 * separate from Supabase Auth's own emails — Auth's SMTP settings live
 * inside Supabase and aren't reachable from application code, so this
 * reuses the same mailbox credentials as their own env vars.
 *
 * Missing config never throws: a club/agency submitting a claim, or an
 * admin reviewing one, must not fail because a notification couldn't be
 * sent. The failure is logged and swallowed instead.
 */
function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) return null;

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass: password },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const transport = buildTransport();
  if (!transport) {
    console.warn("[mailer] SMTP not configured — skipping email:", options.subject);
    return;
  }

  try {
    await transport.sendMail({
      from: `"Africa Football Hub" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  } catch (error) {
    console.error("[mailer] failed to send email:", error);
  }
}

/** Where new-organisation notifications go — falls back to the sender mailbox itself. */
export function adminNotificationEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.SMTP_USER ?? null;
}
