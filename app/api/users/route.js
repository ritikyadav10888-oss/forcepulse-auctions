import { prisma } from '../../../lib/server/db.js';
import { getRequestUser, hashPassword, normaliseEmail, publicUser, validateNewAccount } from '../../../lib/server/auth.js';
import { json, readJson, text } from '../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Force Pulse sees every account; an organiser only sees their own
export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return json({ users: [] });
  const users = user.isSuperAdmin ? await prisma.user.findMany({ orderBy: { createdAt: 'asc' } }) : [user];
  return json({ users: users.map(publicUser) });
}

// Force Pulse creates an organiser account
export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user?.isSuperAdmin) return json({ error: 'Only Force Pulse admins can create accounts.' }, 403);
  const body = (await readJson(request)) || {};
  const problem = validateNewAccount(body);
  if (problem) return json({ error: problem }, 400);
  const email = normaliseEmail(body.email);
  if (await prisma.user.findUnique({ where: { email } })) return json({ error: 'An account with this email already exists.' }, 409);
  const name = text(body.name, 80);
  const created = await prisma.user.create({
    data: { email, name, orgName: text(body.orgName, 120) || `${name}'s League`, passwordHash: await hashPassword(String(body.password)), createdBy: user.email }
  });
  return json({ user: publicUser(created) }, 201);
}
