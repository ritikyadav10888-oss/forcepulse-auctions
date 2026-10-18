import { prisma } from '../../../../lib/server/db.js';
import { createSession, normaliseEmail, publicUser, sessionCookie, verifyPassword } from '../../../../lib/server/auth.js';
import { clientIp, json, rateLimited, readJson } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (rateLimited(`login:${clientIp(request)}`, 15)) {
    return json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.' }, 429);
  }
  const body = await readJson(request);
  const email = normaliseEmail(body?.email);
  const user = email && await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(String(body?.password || ''), user.passwordHash))) {
    return json({ error: 'Incorrect email or password.' }, 401);
  }
  const { token, expiresAt } = await createSession(user.id);
  return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(token, expiresAt) });
}
