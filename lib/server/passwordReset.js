import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from './db.js';

// Forgot-password links. The token is signed with AUTH_SECRET over the user's current password hash,
// so it stops working after an hour or as soon as the password has been changed (single use).
const RESET_MINUTES = 60;

const secret = () => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Without AUTH_SECRET, links only work until the server restarts
  if (!globalThis.__fpResetSecret) {
    console.warn('[force-pulse] AUTH_SECRET not set in .env: password-reset links stop working when the server restarts.');
    globalThis.__fpResetSecret = randomBytes(32).toString('hex');
  }
  return globalThis.__fpResetSecret;
};

const sign = (userId, expires, passwordHash) =>
  createHmac('sha256', secret()).update(`${userId}.${expires}.${passwordHash}`).digest('base64url');

export const createResetToken = (user) => {
  const expires = Date.now() + RESET_MINUTES * 60000;
  return `${Buffer.from(`${user.id}.${expires}`).toString('base64url')}.${sign(user.id, expires, user.passwordHash)}`;
};

// The user a reset token belongs to, or null when it is invalid, expired or already used
export const userFromResetToken = async (token) => {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const [userId, expiresText] = Buffer.from(payload, 'base64url').toString().split('.');
  const expires = Number(expiresText);
  if (!userId || !(expires > Date.now())) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const expected = Buffer.from(sign(user.id, expires, user.passwordHash));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? user : null;
};

// Link to the app's reset page. APP_URL is preferred so the link never trusts the request's Host header
export const resetLink = (request, token) => {
  const base = (process.env.APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
  return `${base}/#/reset/${token}`;
};

const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const sendResetEmail = async (user, link) => {
  if (!smtpConfigured()) {
    // Development fallback: no mail server yet, so the link goes to the server console
    console.warn(`[force-pulse] SMTP not set in .env, so no email was sent. Password reset link for ${user.email}:\n  ${link}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || `Force Pulse <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Reset your Force Pulse password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in ${RESET_MINUTES} minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.\n\nForce Pulse`,
    html: `<p>Hi ${escapeHtml(user.name)},</p>
<p>Use the button below to choose a new password. It works once and expires in ${RESET_MINUTES} minutes.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#84cc16;color:#020617;font-weight:800;padding:12px 20px;border-radius:10px;text-decoration:none">Reset password</a></p>
<p style="color:#64748b;font-size:13px">If you didn't ask for this, you can ignore this email.</p>
<p>Force Pulse</p>`
  });
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
