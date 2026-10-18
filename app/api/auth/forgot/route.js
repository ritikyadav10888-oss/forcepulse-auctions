import { prisma } from '../../../../lib/server/db.js';
import { normaliseEmail } from '../../../../lib/server/auth.js';
import { createResetToken, resetLink, sendResetEmail } from '../../../../lib/server/passwordReset.js';
import { clientIp, json, rateLimited, readJson } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Emails a password-reset link. Always answers the same way, so it can't be used to find out who has an account
export async function POST(request) {
  if (rateLimited(`forgot:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return json({ error: 'Too many reset requests. Please try again later.' }, 429);
  }
  const body = await readJson(request);
  const email = normaliseEmail(body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !rateLimited(`forgot-email:${email}`, 3, 60 * 60 * 1000)) {
    try {
      await sendResetEmail(user, resetLink(request, createResetToken(user)));
    } catch (err) {
      console.error('[force-pulse] Could not send password reset email:', err.message);
      return json({ error: "We couldn't send the email right now. Please try again in a few minutes." }, 502);
    }
  }
  return json({ ok: true });
}
