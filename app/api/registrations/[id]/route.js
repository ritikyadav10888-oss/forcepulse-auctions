import { prisma, parse } from '../../../../lib/server/db.js';
import { getRequestUser } from '../../../../lib/server/auth.js';
import { json, readJson } from '../../../../lib/server/http.js';
import { notifyRegistrations } from '../../../../lib/server/store.js';

export const dynamic = 'force-dynamic';

// Organiser approves or rejects a sign-up (approving also adds the player in the app)
export async function PATCH(request, { params }) {
  const user = await getRequestUser(request);
  const body = (await readJson(request)) || {};
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(body.status)) return json({ error: 'Bad request.' }, 400);
  const row = await prisma.registration.findUnique({ where: { id: params.id } });
  const auction = row && parse(await prisma.auction.findUnique({ where: { id: row.auctionId } }));
  const owner = String(auction?.ownerEmail || '').toLowerCase();
  if (!auction || !user || !(user.isSuperAdmin || owner === user.email)) return json({ error: 'Not allowed.' }, 403);
  await prisma.registration.update({ where: { id: row.id }, data: { status: body.status } });
  notifyRegistrations(row.auctionId, owner);
  return json({ ok: true });
}
