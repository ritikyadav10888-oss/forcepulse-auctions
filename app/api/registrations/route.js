import { prisma, parse } from '../../../lib/server/db.js';
import { getRequestUser } from '../../../lib/server/auth.js';
import { clientIp, json, rateLimited, readJson, text } from '../../../lib/server/http.js';
import { notifyRegistrations } from '../../../lib/server/store.js';

export const dynamic = 'force-dynamic';

const canManage = (user, auction) => !!user && (user.isSuperAdmin || String(auction?.ownerEmail || '').toLowerCase() === user.email);

// Organiser: the sign-ups for one auction (phone numbers are only shown here)
export async function GET(request) {
  const user = await getRequestUser(request);
  const auctionId = new URL(request.url).searchParams.get('auctionId');
  const auction = auctionId && parse(await prisma.auction.findUnique({ where: { id: auctionId } }));
  if (!auction || !canManage(user, auction)) return json({ error: 'Not allowed.' }, 403);
  const rows = await prisma.registration.findMany({ where: { auctionId }, orderBy: { createdAt: 'desc' } });
  return json({ registrations: rows.map(r => ({ ...parse(r), id: r.id, status: r.status, createdAt: r.createdAt })) });
}

// Public: a player signs up for an auction whose registration is open
export async function POST(request) {
  if (rateLimited(`registration:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return json({ error: 'Too many sign-ups from this network. Please try again later.' }, 429);
  }
  const body = (await readJson(request)) || {};
  const auction = body.auctionId && parse(await prisma.auction.findUnique({ where: { id: String(body.auctionId) } }));
  if (!auction) return json({ error: 'Auction not found.' }, 404);
  if (!auction.registrationOpen) return json({ error: 'Player registration for this auction is closed.' }, 403);

  const name = text(body.name, 80);
  const phone = text(body.phone, 20).replace(/[^\d+\s-]/g, '');
  if (!name) return json({ error: 'Please enter your name.' }, 400);
  if (phone.replace(/\D/g, '').length < 8) return json({ error: 'Please enter a valid phone number.' }, 400);
  const categories = auction.categories || [];
  const category = text(body.category, 40);
  if (categories.length && !categories.includes(category)) return json({ error: 'Please choose a category.' }, 400);
  const image = text(body.image, 200);

  const data = {
    name,
    phone,
    category,
    role: text(body.role, 60),
    age: Number(body.age) > 0 && Number(body.age) < 100 ? Math.round(Number(body.age)) : null,
    country: text(body.country, 40),
    isOverseas: !!body.isOverseas,
    battingStyle: text(body.battingStyle, 40),
    bowlingStyle: text(body.bowlingStyle, 40),
    previousTeam: text(body.previousTeam, 60),
    stats: {
      matches: Math.max(0, Math.round(Number(body.matches) || 0)),
      runs: Math.max(0, Math.round(Number(body.runs) || 0)),
      wickets: Math.max(0, Math.round(Number(body.wickets) || 0))
    },
    image: image.startsWith('/api/uploads/') ? image : '',
    notes: text(body.notes, 300)
  };
  const row = await prisma.registration.create({ data: { auctionId: auction.id, data: JSON.stringify(data) } });
  notifyRegistrations(auction.id, String(auction.ownerEmail || '').toLowerCase());
  return json({ ok: true, id: row.id }, 201);
}
