import { prisma } from '../../../../lib/server/db.js';
import { clearedCookie, tokenFromCookies } from '../../../../lib/server/auth.js';
import { json } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const token = tokenFromCookies(request.headers.get('cookie'));
  if (token) await prisma.session.deleteMany({ where: { token } });
  return json({ ok: true }, 200, { 'Set-Cookie': clearedCookie() });
}
