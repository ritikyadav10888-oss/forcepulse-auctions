import { prisma } from '../../../../lib/server/db.js';
import { createSession, hashPassword, publicUser, sessionCookie } from '../../../../lib/server/auth.js';
import { userFromResetToken } from '../../../../lib/server/passwordReset.js';
import { clientIp, json, rateLimited, readJson } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Sets a new password from a reset link, signs out every other device and signs this one in
export async function POST(request) {
  if (rateLimited(`reset:${clientIp(request)}`, 10)) {
    return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
  }
  const body = (await readJson(request)) || {};
  const password = String(body.password || '');
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

  const user = await userFromResetToken(body.token);
  if (!user) return json({ error: 'This reset link is invalid or has expired. Please ask for a new one.' }, 400);

  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const { token, expiresAt } = await createSession(user.id);
  return json({ user: publicUser(updated) }, 200, { 'Set-Cookie': sessionCookie(token, expiresAt) });
}
