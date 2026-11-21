// api/src/mail.mjs
import nodemailer from 'nodemailer';

let transport = null;

function getTransport() {
  if (transport) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transport;
}

export async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) {
    console.error('SMTP is not configured');
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
    return true;
  } catch (err) {
    console.error('Mail failed:', err.message);
    return false;
  }
}
