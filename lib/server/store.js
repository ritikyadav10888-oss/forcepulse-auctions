// Server side of the app's data: what each visitor may load, and which changes they may save.
// Every saved change is pushed to the other open screens over Socket.IO.
import { prisma, parse } from './db.js';
import { FREE_PLAN, getPlan } from '../../src/config/forcePulse.js';

export const COLLECTIONS = ['auctions', 'teams', 'players', 'live', 'unlockRequests'];
const MODEL = { auctions: 'auction', teams: 'team', players: 'player', live: 'liveState', unlockRequests: 'unlockRequest' };

// Fields only Force Pulse may set on an auction
const PROTECTED_AUCTION_FIELDS = ['plan', 'teamLimit', 'managedByForcePulse', 'ownerEmail', 'publicPageEnabled'];

const isPublic = (auction) => !!auction && auction.publicPageEnabled !== false;
const isManaged = (auction) => !!auction?.managedByForcePulse || getPlan(auction?.plan).id !== FREE_PLAN.id;
const ownerOf = (auction) => String(auction?.ownerEmail || '').toLowerCase() || null;

export class SyncError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

// ---------- Reading ----------
// Visitors see public auctions plus one they open by link; organisers also see their own; Force Pulse sees all.
export const loadState = async (user, requestedAuctionId = null) => {
  const auctionRows = await prisma.auction.findMany({ orderBy: { createdAt: 'desc' } });
  const auctions = auctionRows.map(parse).filter(a => user?.isSuperAdmin || isPublic(a)
    || (user && ownerOf(a) === user.email) || a.id === requestedAuctionId);
  const ids = auctions.map(a => a.id);

  const [teams, players, live, requests] = await Promise.all([
    prisma.team.findMany({ where: { auctionId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
    prisma.player.findMany({ where: { auctionId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
    prisma.liveState.findMany({ where: { id: { in: ids } } }),
    !user ? [] : prisma.unlockRequest.findMany({ where: user.isSuperAdmin ? {} : { ownerEmail: user.email }, orderBy: { createdAt: 'desc' } })
  ]);

  return {
    auctions,
    teams: teams.map(parse),
    players: players.map(parse),
    live: Object.fromEntries(live.map(r => [r.id, parse(r)])),
    unlockRequests: requests.map(parse)
  };
};

// ---------- Writing ----------
// changes: [{ collection, upserts: [record], deletes: [id] }], applied in order in one transaction.
export const applySync = async (user, changes, origin = null) => {
  if (!user) throw new SyncError('Please sign in again.', 401);
  if (!Array.isArray(changes)) throw new SyncError('Bad request.', 400);

  // Auction rows touched in this batch (ownership + plan), loaded on demand
  const auctionInfo = new Map();
  const getAuction = async (id) => {
    if (!id) return null;
    if (!auctionInfo.has(id)) auctionInfo.set(id, parse(await prisma.auction.findUnique({ where: { id } })));
    return auctionInfo.get(id);
  };
  const canManage = async (auctionId) => {
    if (user.isSuperAdmin) return true;
    const auction = await getAuction(auctionId);
    return !!auction && ownerOf(auction) === user.email;
  };
  const deny = (what) => { throw new SyncError(`You can't change ${what}.`); };

  const ops = [];
  const outgoing = []; // { collection, auctionId?, ownerEmail?, upserts, deletes }
  const newTeams = new Map(); // auctionId -> teams added in this batch

  for (const change of changes) {
    const { collection } = change || {};
    if (!COLLECTIONS.includes(collection)) throw new SyncError('Bad request.', 400);
    const model = prisma[MODEL[collection]];
    const upserts = Array.isArray(change.upserts) ? change.upserts : [];
    const deletes = Array.isArray(change.deletes) ? change.deletes.map(String) : [];

    for (const raw of upserts) {
      if (!raw || typeof raw !== 'object' || !raw.id) throw new SyncError('Bad request.', 400);
      let record = { ...raw, id: String(raw.id) };
      let auctionId;
      let ownerEmail = null;

      if (collection === 'auctions') {
        const existing = await getAuction(record.id);
        if (existing) {
          if (!(await canManage(record.id))) deny('this auction');
          if (!user.isSuperAdmin) for (const k of PROTECTED_AUCTION_FIELDS) record[k] = existing[k];
        } else if (!user.isSuperAdmin) {
          // Organisers create free auctions that stay private until Force Pulse verifies them
          record = { ...record, plan: FREE_PLAN.id, teamLimit: FREE_PLAN.teamLimit, managedByForcePulse: false, publicPageEnabled: false, ownerEmail: user.email };
        }
        ownerEmail = ownerOf(record);
        auctionInfo.set(record.id, record);
        auctionId = record.id;
        ops.push(model.upsert({ where: { id: record.id }, create: { id: record.id, ownerEmail, data: JSON.stringify(record) }, update: { ownerEmail, data: JSON.stringify(record) } }));
      } else if (collection === 'teams' || collection === 'players') {
        auctionId = String(record.auctionId || '');
        if (!(await canManage(auctionId))) deny('this auction');
        const existing = await model.findUnique({ where: { id: record.id }, select: { auctionId: true } });
        if (existing && existing.auctionId !== auctionId && !(await canManage(existing.auctionId))) deny('this auction');
        if (collection === 'teams' && !existing) newTeams.set(auctionId, (newTeams.get(auctionId) || 0) + 1);
        ops.push(model.upsert({ where: { id: record.id }, create: { id: record.id, auctionId, data: JSON.stringify(record) }, update: { auctionId, data: JSON.stringify(record) } }));
      } else if (collection === 'live') {
        auctionId = record.id;
        if (!(await canManage(auctionId))) deny('this auction');
        const { id: _id, ...state } = record;
        ops.push(model.upsert({ where: { id: auctionId }, create: { id: auctionId, data: JSON.stringify(state) }, update: { data: JSON.stringify(state) } }));
        record = state;
        record.id = auctionId;
      } else {
        // unlockRequests: organisers file their own pending requests; Force Pulse resolves them
        const existing = parse(await model.findUnique({ where: { id: record.id } }));
        if (!user.isSuperAdmin) {
          if (existing && (existing.ownerEmail !== user.email || existing.status !== 'PENDING')) deny('this request');
          record = { ...record, ownerEmail: user.email, status: 'PENDING' };
        }
        ownerEmail = String(record.ownerEmail || '').toLowerCase();
        ops.push(model.upsert({ where: { id: record.id }, create: { id: record.id, ownerEmail, data: JSON.stringify(record) }, update: { ownerEmail, data: JSON.stringify(record) } }));
      }
      outgoing.push({ collection, auctionId, ownerEmail, upserts: [collection === 'live' ? { ...record } : record], deletes: [] });
    }

    for (const id of deletes) {
      if (collection === 'auctions') {
        const auction = await getAuction(id);
        if (!auction) continue;
        if (!(await canManage(id)) || (!user.isSuperAdmin && isManaged(auction))) deny('this auction');
        ops.push(prisma.team.deleteMany({ where: { auctionId: id } }), prisma.player.deleteMany({ where: { auctionId: id } }),
          prisma.liveState.deleteMany({ where: { id } }), prisma.registration.deleteMany({ where: { auctionId: id } }), model.deleteMany({ where: { id } }));
        outgoing.push({ collection, auctionId: id, ownerEmail: ownerOf(auction), upserts: [], deletes: [id], wasPublic: isPublic(auction) });
      } else if (collection === 'teams' || collection === 'players') {
        const row = await model.findUnique({ where: { id }, select: { auctionId: true } });
        if (!row) continue;
        if (!(await canManage(row.auctionId))) deny('this auction');
        ops.push(model.deleteMany({ where: { id } }));
        outgoing.push({ collection, auctionId: row.auctionId, upserts: [], deletes: [id] });
      } else if (collection === 'live') {
        if (!(await canManage(id))) deny('this auction');
        ops.push(model.deleteMany({ where: { id } }));
        outgoing.push({ collection, auctionId: id, upserts: [], deletes: [id] });
      } else {
        const existing = parse(await model.findUnique({ where: { id } }));
        if (!existing) continue;
        if (!user.isSuperAdmin && (existing.ownerEmail !== user.email || existing.status !== 'PENDING')) deny('this request');
        ops.push(model.deleteMany({ where: { id } }));
        outgoing.push({ collection, ownerEmail: existing.ownerEmail, upserts: [], deletes: [id] });
      }
    }
  }

  // Organisers stay within their plan's team limit (Force Pulse moves the plan up instead)
  if (!user.isSuperAdmin) {
    for (const [auctionId, added] of newTeams) {
      const limit = getPlan((await getAuction(auctionId))?.plan).teamLimit;
      if ((await prisma.team.count({ where: { auctionId } })) + added > limit) {
        throw new SyncError(`This plan allows ${limit} teams. Request Force Pulse to set up a bigger auction.`);
      }
    }
  }

  await prisma.$transaction(ops);
  await broadcast(outgoing, origin, getAuction);
};

// ---------- Live push ----------
// Who hears about a change: everyone watching that auction, Force Pulse, the owner, and (for public auctions) everyone.
const broadcast = async (outgoing, origin, getAuction) => {
  const io = globalThis.__fpIo;
  if (!io) return;
  for (const item of outgoing) {
    const rooms = new Set(['admins']);
    if (item.collection === 'unlockRequests') {
      if (item.ownerEmail) rooms.add(`user:${item.ownerEmail}`);
    } else {
      const auction = await getAuction(item.auctionId);
      rooms.add(`auction:${item.auctionId}`);
      const owner = item.ownerEmail || ownerOf(auction);
      if (owner) rooms.add(`user:${owner}`);
      if (isPublic(auction) || item.wasPublic) rooms.add('public');
    }
    io.to([...rooms]).emit('sync', { origin, collection: item.collection, upserts: item.upserts, deletes: item.deletes });
  }
};

// Tell watchers that registrations changed (organiser's list refreshes)
export const notifyRegistrations = (auctionId, ownerEmail) => {
  const io = globalThis.__fpIo;
  if (!io) return;
  const rooms = ['admins'];
  if (ownerEmail) rooms.push(`user:${ownerEmail}`);
  io.to(rooms).emit('registrations', { auctionId });
};
