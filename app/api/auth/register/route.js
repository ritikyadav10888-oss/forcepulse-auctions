import { prisma } from '../../../../lib/server/db.js';
import { createSession, hashPassword, normaliseEmail, publicUser, sessionCookie, validateNewAccount } from '../../../../lib/server/auth.js';
import { clientIp, json, rateLimited, readJson, text } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Organiser sign-up: creates the account and signs it in
export async function POST(request) {
  if (rateLimited(`register:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return json({ error: 'Too many sign-ups from this network. Please try again later.' }, 429);
  }
  const body = (await readJson(request)) || {};
  const problem = validateNewAccount(body);
  if (problem) return json({ error: problem }, 400);

  const email = normaliseEmail(body.email);
  if (await prisma.user.findUnique({ where: { email } })) {
    return json({ error: 'An account with this email address already exists.' }, 409);
  }
  const name = text(body.name, 80);
  const user = await prisma.user.create({
    data: { email, name, orgName: text(body.orgName, 120) || `${name}'s Sports League`, passwordHash: await hashPassword(String(body.password)) }
  });
  const { token, expiresAt } = await createSession(user.id);
  return json({ user: publicUser(user) }, 201, { 'Set-Cookie': sessionCookie(token, expiresAt) });
}
