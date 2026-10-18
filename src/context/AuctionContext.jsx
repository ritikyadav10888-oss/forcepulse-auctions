import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../services/soundEffects';
import confetti from 'canvas-confetti';
import { FREE_PLAN, getPlan, planForTeams } from '../config/forcePulse';
import { DEFAULT_TEAM_LOGO } from '../config/placeholders';
import { api, connectLive, diffCollection, queueChange, setSaveErrorHandler, watchAuctions } from '../services/serverSync';
import { formatMoney } from '../services/money';

export const TEAM_PRICING_CONFIG = {
  FREE_TEAMS_LIMIT: 2,
  PRICE_PER_EXTRA_TEAM: 500 // ₹500 per extra team after first 2 free teams
};

const DEFAULT_BID_INCREMENTS = [
  { maxPrice: 1, step: 0.1 },
  { maxPrice: 5, step: 0.25 },
  { maxPrice: 10, step: 0.5 },
  { maxPrice: Infinity, step: 1.0 }
];

const DEFAULT_LIVE = {
  currentPlayerId: null,
  bidHistory: [],
  hostView: 'AUTO' // what the Host Screen shows: AUTO (yet-to-start / player on the floor), UPCOMING, SOLD, UNSOLD, TEAMS
};

// Settings the organiser can change while running any auction, including Force Pulse-managed ones
export const RUN_SETTING_KEYS = ['status', 'allowSameTeamRebid', 'playerOrder', 'hostDesign', 'registrationOpen'];

export const getRunSettings = (auction) => ({
  allowSameTeamRebid: !!auction?.allowSameTeamRebid, // leading team may raise its own bid
  playerOrder: auction?.playerOrder || 'SEQUENTIAL', // SEQUENTIAL by set, or RANDOM draw
  hostDesign: auction?.hostDesign || 'card'
});

export const HOST_VIEWS = [
  ['AUTO', 'Live Player'],
  ['UPCOMING', 'All Players'],
  ['SOLD', 'Sold'],
  ['UNSOLD', 'Unsold'],
  ['TEAMS', 'Teams & Purse'],
  ['LUCKY_DRAW', 'Team Lucky Draw'],
  ['UPDATES', 'Auction Updates']
];

// Auctions, teams, players, live state and requests live on the server (see lib/server/store.js):
// every change is saved there and pushed to every open screen, on any device.
// Only the auction a tab has open is kept per browser.
const ACTIVE_AUCTION_KEY = 'fp_active_auction';

export const getAuctionPlan = (auction) => getPlan(auction?.plan || FREE_PLAN.id);

// Auction a page was opened for (?auction=<id>, #/auctions/<id>, #/register/<id>), so its data is loaded even when private
const linkedAuctionId = () => {
  const fromQuery = new URLSearchParams(window.location.search).get('auction');
  const [section, id] = window.location.hash.replace(/^#\/?/, '').split('/');
  return fromQuery || ((section === 'auctions' || section === 'register') && id ? decodeURIComponent(id) : null);
};

// State held on the server. The setter works like useState's, and also saves what changed;
// load() replaces it with a server copy and applyRemote() merges changes pushed from other screens.
const useSyncedState = (name, initial, isMap = false) => {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const set = useCallback((update) => {
    const prev = ref.current;
    const next = typeof update === 'function' ? update(prev) : update;
    if (next === prev) return;
    ref.current = next;
    setValue(next);
    const { upserts, deletes } = diffCollection(prev, next, isMap);
    queueChange(name, upserts, deletes);
  }, [name, isMap]);
  const load = useCallback((next) => {
    ref.current = next;
    setValue(next);
  }, []);
  const applyRemote = useCallback(({ upserts, deletes }) => {
    const prev = ref.current;
    let next;
    if (isMap) {
      next = { ...prev };
      upserts.forEach(({ id, ...rest }) => { next[id] = rest; });
      deletes.forEach(id => { delete next[id]; });
    } else {
      const removed = new Set(deletes);
      const changed = new Map(upserts.map(r => [r.id, r]));
      const known = new Set(prev.map(r => r.id));
      const added = upserts.filter(r => !known.has(r.id));
      const kept = prev.filter(r => !removed.has(r.id)).map(r => changed.get(r.id) || r);
      // newest first for auctions and requests, in order of creation for teams and players
      next = name === 'auctions' || name === 'unlockRequests' ? [...added, ...kept] : [...kept, ...added];
    }
    ref.current = next;
    setValue(next);
  }, [name, isMap]);
  return [value, set, load, applyRemote];
};

// Auctions on a paid plan (more than 2 teams) are set up by Force Pulse: the organiser runs them
// but teams, players and rules are managed from the Force Pulse admin panel.
// Public page shows only once Force Pulse has verified the auction (older auctions without the flag are public)
export const isPublicAuction = (auction) => !!auction && auction.publicPageEnabled !== false;

export const isManagedAuction = (auction) => !!auction?.managedByForcePulse || getAuctionPlan(auction).id !== FREE_PLAN.id;

const IS_OVERLAY_WINDOW = new URLSearchParams(window.location.search).get('screen') === 'overlay';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const loadJSON = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

// useState that persists to localStorage and (unless sync is false) picks up writes made by other tabs
const usePersistentState = (key, fallback, sync = true) => {
  const [value, setValue] = useState(() => loadJSON(key, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }, [key, value]);

  useEffect(() => {
    if (!sync) return undefined;
    const onStorage = (e) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue));
      } catch {
        // ignore malformed writes
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, sync]);

  return [value, setValue];
};

// Bid increment slab for a given price, from the auction's own rules
export const getBidIncrement = (auction, amount) => {
  const slabs = (auction?.bidIncrements?.length ? auction.bidIncrements : DEFAULT_BID_INCREMENTS)
    .map(s => ({ maxPrice: s.maxPrice ?? Infinity, step: Number(s.step) }))
    .sort((a, b) => a.maxPrice - b.maxPrice);
  const slab = slabs.find(s => amount < s.maxPrice) || slabs[slabs.length - 1];
  return slab.step;
};

// Opening bid is the base price; after that, current bid + slab increment
export const getNextBidAmount = (auction, player) => {
  if (!player) return 0;
  if (!player.highestBidderTeamId) return round2(player.basePrice);
  return round2(player.currentBid + getBidIncrement(auction, player.currentBid));
};

const AuctionContext = createContext(null);

export const AuctionProvider = ({ children }) => {
  // ---------- Server state (shared by every device) ----------
  const [auctions, setAuctions, loadAuctions, applyAuctions] = useSyncedState('auctions', []);
  const [rawTeams, setTeams, loadTeams, applyTeams] = useSyncedState('teams', []);
  const [players, setPlayers, loadPlayers, applyPlayers] = useSyncedState('players', []);
  const [live, setLive, loadLive, applyLive] = useSyncedState('live', {}, true);
  const [unlockRequests, setUnlockRequests, loadRequests, applyRequests] = useSyncedState('unlockRequests', []);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [storedActiveAuctionId, setActiveAuctionId] = usePersistentState(ACTIVE_AUCTION_KEY, null, false);

  // ---------- Per-tab UI state ----------
  // Active Role: ADMIN or USER. Every visit opens on the public site; admin view requires a signed-in account
  const [role, setRoleState] = useState('USER');
  const [autoBotBidding, setAutoBotBidding] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [notice, setNotice] = useState(null);
  // Number of mounted Auctioneer Consoles in this tab. Only a controlling tab runs the
  // timer hammer and bot bidder, so a second (viewer) window never double-sells a player.
  const [controllerCount, setControllerCount] = useState(0);
  const isController = controllerCount > 0;

  const setRole = (nextRole) => {
    if (nextRole === 'ADMIN' && !currentUser) return false;
    setRoleState(nextRole);
    return true;
  };

  // Sign-out in another tab drops this tab back to the public view
  useEffect(() => {
    if (!currentUser && role === 'ADMIN') setRoleState('USER');
  }, [currentUser, role]);

  const showNotice = useCallback((text, type = 'error') => {
    setNotice({ text, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // ---------- Loading & live updates ----------
  const refreshState = useCallback(async () => {
    const auctionId = linkedAuctionId();
    const state = await api(`/api/state${auctionId ? `?auction=${encodeURIComponent(auctionId)}` : ''}`);
    loadAuctions(state.auctions);
    loadTeams(state.teams);
    loadPlayers(state.players);
    loadLive(state.live);
    loadRequests(state.unlockRequests);
  }, [loadAuctions, loadTeams, loadPlayers, loadLive, loadRequests]);

  const refreshUsers = useCallback(async () => {
    const { users: list } = await api('/api/users');
    setUsers(list);
  }, []);

  // Signed-in account first, then everything it may see
  useEffect(() => {
    api('/api/auth/me')
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => refreshState().catch(() => showNotice('Could not reach the server. Check your connection and reload.')).finally(() => setLoaded(true)));
  }, []);

  // A rejected or failed save: tell the user and go back to what the server has
  useEffect(() => {
    setSaveErrorHandler((err) => {
      showNotice(err.message);
      refreshState().catch(() => {});
    });
  }, [refreshState, showNotice]);

  // Live feed: reconnects when the account changes, since what this tab may hear depends on it
  const userKey = currentUser?.email || '';
  useEffect(() => {
    if (!loaded) return undefined;
    const apply = { auctions: applyAuctions, teams: applyTeams, players: applyPlayers, live: applyLive, unlockRequests: applyRequests };
    return connectLive({
      onSync: (msg) => apply[msg.collection]?.(msg),
      onRegistrations: (msg) => window.dispatchEvent(new CustomEvent('fp:registrations', { detail: msg })),
      onReconnect: () => refreshState().catch(() => {})
    });
  }, [loaded, userKey]);

  useEffect(() => {
    if (currentUser) refreshUsers().catch(() => {});
    else setUsers([]);
  }, [userKey]);

  useEffect(() => { watchAuctions(auctions.map(a => a.id)); }, [auctions]);

  // ---------- Derived auction-scoped data ----------
  const activeAuction = auctions.find(a => a.id === storedActiveAuctionId) || auctions[0] || null;
  const activeAuctionId = activeAuction?.id || null;

  const allTeams = rawTeams.map(t => {
    const squad = players.filter(p => p.status === 'SOLD' && p.soldToTeamId === t.id);
    const spent = round2(squad.reduce((sum, p) => sum + Number(p.soldPrice || 0), 0));
    const initialPurse = Number(t.initialPurse || 0);
    return {
      ...t,
      initialPurse,
      spent,
      purseRemaining: round2(initialPurse - spent), // always derived from sold players
      squadCount: squad.length,
      overseasCount: squad.filter(p => p.isOverseas).length
    };
  });

  const teams = allTeams.filter(t => t.auctionId === activeAuctionId);

  // ---------- Ownership & plan locks ----------
  const isSuperAdmin = !!currentUser?.isSuperAdmin;
  const ownerOf = (auction) => (auction.ownerEmail || '').toLowerCase();
  const myAuctions = !currentUser ? [] : isSuperAdmin
    ? auctions
    : auctions.filter(a => ownerOf(a) === currentUser.email.toLowerCase());

  const getAuctionLock = (auctionId) => {
    const auction = auctions.find(a => a.id === auctionId);
    const plan = getAuctionPlan(auction);
    const teamCount = allTeams.filter(t => t.auctionId === auctionId).length;
    return { locked: teamCount > plan.teamLimit, teamCount, teamLimit: plan.teamLimit, plan };
  };
  const activeLock = getAuctionLock(activeAuctionId);
  // Can the signed-in account change teams, players and rules of the open auction?
  const canSetup = !!activeAuction && (isSuperAdmin || !isManagedAuction(activeAuction));
  const SETUP_DENIED = 'This auction is set up by Force Pulse. Contact Force Pulse to change teams, players or rules.';
  const guardSetup = () => {
    if (canSetup) return true;
    showNotice(SETUP_DENIED);
    return false;
  };
  const lockedMessage = `This auction is locked: ${activeLock.teamCount} teams on the ${activeLock.plan.name} plan (max ${activeLock.teamLimit}). Contact Force Pulse to unlock it.`;
  const auctionPlayers = players.filter(p => p.auctionId === activeAuctionId);

  const liveState = { ...DEFAULT_LIVE, ...(live[activeAuctionId] || {}) };
  const currentPlayer =
    auctionPlayers.find(p => p.id === liveState.currentPlayerId) ||
    auctionPlayers.find(p => p.status === 'CURRENT') ||
    null;

  const bidHistory = liveState.bidHistory;

  const updateLive = (patch) => {
    if (!activeAuctionId) return;
    setLive(prev => {
      const cur = { ...DEFAULT_LIVE, ...(prev[activeAuctionId] || {}) };
      const next = typeof patch === 'function' ? patch(cur) : patch;
      return { ...prev, [activeAuctionId]: { ...cur, ...next } };
    });
  };

  // ---------- Bidding rules ----------
  // Money a team keeps aside per still-empty minimum squad slot: a fixed amount set on the auction,
  // otherwise the lowest base price in the pool
  const reservePerSlot = (() => {
    const fixed = Number(activeAuction?.reservePerPlayer || 0);
    if (activeAuction?.useFixedReserve && fixed > 0) return fixed;
    const prices = auctionPlayers.map(p => Number(p.basePrice)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : 0;
  })();

  // Infinity when the auction has unlimited team purse; the whole purse when max-bid calculation is off
  const getTeamMaxBid = (team) => {
    if (activeAuction?.unlimitedPurse) return Infinity;
    if (activeAuction?.calcMaxBid === false) return round2(Math.max(0, team.purseRemaining));
    const minSquad = Number(activeAuction?.minSquadSize || 0);
    const slotsToReserve = Math.max(0, minSquad - team.squadCount - 1);
    return round2(Math.max(0, team.purseRemaining - slotsToReserve * reservePerSlot));
  };

  const canTeamBid = (teamId, amount, player = currentPlayer) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { ok: false, reason: 'Team not found in this auction.' };
    if (!player || player.status !== 'CURRENT') return { ok: false, reason: 'No player is on the bidding floor.' };
    if (player.highestBidderTeamId === teamId && !getRunSettings(activeAuction).allowSameTeamRebid) {
      return { ok: false, reason: `${team.name} already holds the highest bid.` };
    }
    const maxSquad = Number(activeAuction?.maxSquadSize || Infinity);
    if (team.squadCount >= maxSquad) return { ok: false, reason: `${team.name} squad is full (${maxSquad} players).` };
    const maxOverseas = Number(activeAuction?.maxOverseas ?? Infinity);
    if (player.isOverseas && team.overseasCount >= maxOverseas) {
      return { ok: false, reason: `${team.name} has reached the overseas limit (${maxOverseas}).` };
    }
    if (activeAuction?.unlimitedPurse) return { ok: true };
    if (amount > team.purseRemaining) return { ok: false, reason: `${team.name} does not have enough purse (${formatMoney(team.purseRemaining)} left).` };
    const maxBid = getTeamMaxBid(team);
    if (amount > maxBid) {
      return { ok: false, reason: `${team.name} can bid at most ${formatMoney(maxBid)} (must keep purse for minimum squad of ${activeAuction?.minSquadSize}).` };
    }
    return { ok: true };
  };

  const nextBidAmount = getNextBidAmount(activeAuction, currentPlayer);
  // Amount the auctioneer has raised the price to on the control bar, before any team takes it
  const asking = liveState.askingBid;
  const askingBid = currentPlayer?.status === 'CURRENT' && asking?.playerId === currentPlayer.id && asking.amount > nextBidAmount
    ? asking.amount
    : null;
  const setAskingBid = (amount) => updateLive({ askingBid: amount ? { playerId: currentPlayer?.id, amount: round2(amount) } : null });
  const runSettings = getRunSettings(activeAuction);

  // ---------- Auth ----------
  // Sign-in, sign-up and sign-out go through the server (session cookie); they return { success, error }
  const signedIn = async (user, desiredRole = 'ADMIN') => {
    setCurrentUser(user);
    setRoleState(desiredRole === 'PUBLIC' || desiredRole === 'USER' ? 'USER' : 'ADMIN');
    await refreshState().catch(() => {});
    return { success: true };
  };

  const loginUser = async (email, password, desiredRole = 'ADMIN') => {
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      return signedIn(user, desiredRole);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logoutUser = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    setRoleState('USER');
    setAutoBotBidding(false);
    await refreshState().catch(() => {});
  };

  // New organiser account; they create their first auction from the dashboard
  const registerUser = async ({ name, email, password, orgName }) => {
    try {
      const { user } = await api('/api/auth/register', { method: 'POST', body: { name, email, password, orgName } });
      return signedIn(user);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Forgot password: the server emails a reset link (same answer whether or not the account exists)
  const requestPasswordReset = async (email) => {
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { email } });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // New password from a reset link; signs the user straight in
  const resetPassword = async (token, password) => {
    try {
      const { user } = await api('/api/auth/reset', { method: 'POST', body: { token, password } });
      return signedIn(user);
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ---------- Auction actions ----------
  const placeBid = (teamId, amount = nextBidAmount) => {
    if (activeLock.locked) {
      showNotice(lockedMessage);
      return false;
    }
    const player = currentPlayer;
    if (!player || player.status !== 'CURRENT') {
      showNotice('Load a player onto the bidding floor first.');
      return false;
    }
    const bidAmount = round2(amount);
    const minimum = getNextBidAmount(activeAuction, player);
    if (bidAmount < minimum) {
      showNotice(`Bid must be at least ${formatMoney(minimum)}.`);
      return false;
    }
    const check = canTeamBid(teamId, bidAmount, player);
    if (!check.ok) {
      showNotice(check.reason);
      return false;
    }

    setPlayers(prev => prev.map(p => p.id === player.id
      ? { ...p, currentBid: bidAmount, highestBidderTeamId: teamId }
      : p));

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateLive(cur => ({
      askingBid: null,
      bidHistory: [
        {
          id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          playerId: player.id,
          teamId,
          amount: bidAmount,
          prevBid: player.currentBid,
          prevTeamId: player.highestBidderTeamId,
          time
        },
        ...cur.bidHistory
      ].slice(0, 30)
    }));
    return true;
  };

  // Auctioneer correction: take back the most recent bid on the current player
  const undoLastBid = () => {
    const player = currentPlayer;
    if (!player || player.status !== 'CURRENT') return false;
    const last = bidHistory.find(b => b.playerId === player.id);
    if (!last) {
      showNotice('No bids to undo for this player.');
      return false;
    }
    setPlayers(prev => prev.map(p => p.id === player.id
      ? { ...p, currentBid: last.prevBid ?? p.basePrice, highestBidderTeamId: last.prevTeamId ?? null }
      : p));
    updateLive(cur => ({ bidHistory: cur.bidHistory.filter(b => b.id !== last.id) }));
    showNotice('Last bid withdrawn.', 'info');
    return true;
  };

  const teamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'a team';
  const logEvent = (type, text, extra = {}) => updateLive(cur => ({
    events: [{ id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, text, at: new Date().toISOString(), ...extra }, ...(cur.events || [])].slice(0, 40)
  }));

  const sellPlayer = (playerId = currentPlayer?.id) => {
    const target = players.find(p => p.id === playerId);
    if (!target || target.status !== 'CURRENT') return false;
    if (!target.highestBidderTeamId) {
      showNotice('No team has placed a bid for this player yet.');
      return false;
    }
    setPlayers(prev => prev.map(p => p.id === playerId
      ? { ...p, status: 'SOLD', soldToTeamId: target.highestBidderTeamId, soldPrice: target.currentBid }
      : p));
    updateLive({ lastDecidedId: playerId });
    logEvent('SOLD', `${target.name} sold to ${teamName(target.highestBidderTeamId)} for ${formatMoney(target.currentBid)}`, { playerId, teamId: target.highestBidderTeamId, amount: target.currentBid });
    return true;
  };

  const markPlayerUnsold = (playerId = currentPlayer?.id) => {
    const target = players.find(p => p.id === playerId);
    if (!target || target.status !== 'CURRENT') return false;
    setPlayers(prev => prev.map(p => p.id === playerId
      ? { ...p, status: 'UNSOLD', currentBid: p.basePrice, highestBidderTeamId: null, soldToTeamId: null, soldPrice: null }
      : p));
    updateLive({ lastDecidedId: playerId });
    logEvent('UNSOLD', `${target.name} went unsold (base ${formatMoney(target.basePrice)})`, { playerId });
    return true;
  };

  // For leftover players: no bids, so a random team that can afford the base price and has squad space gets the player
  const sellToRandomTeam = () => {
    const player = currentPlayer;
    if (!player || player.status !== 'CURRENT') {
      showNotice('Put a player on the table first.');
      return null;
    }
    if (player.highestBidderTeamId) {
      showNotice(`${teamName(player.highestBidderTeamId)} has already bid. Use Sold instead.`);
      return null;
    }
    const price = round2(player.basePrice);
    const eligible = teams.filter(t => canTeamBid(t.id, price, player).ok);
    if (eligible.length === 0) {
      showNotice('No team can take this player at the base price.');
      return null;
    }
    const team = eligible[Math.floor(Math.random() * eligible.length)];
    setPlayers(prev => prev.map(p => p.id === player.id
      ? { ...p, status: 'SOLD', currentBid: price, highestBidderTeamId: team.id, soldToTeamId: team.id, soldPrice: price }
      : p));
    updateLive({ lastDecidedId: player.id });
    logEvent('SOLD', `${player.name} assigned to ${team.name} at base price ${formatMoney(price)} (random team)`, { playerId: player.id, teamId: team.id, amount: price });
    showNotice(`${player.name} goes to ${team.name} (random team) for ${formatMoney(price)}.`, 'info');
    return team.id;
  };

  // Team Lucky Draw: pick a random team; host screens show the draw animation and the winner
  const runLuckyDraw = (title = '') => {
    if (teams.length === 0) {
      showNotice('This auction has no teams.');
      return null;
    }
    const team = teams[Math.floor(Math.random() * teams.length)];
    const draw = { id: `draw-${Date.now()}`, teamId: team.id, title: title.trim(), at: Date.now() };
    updateLive(cur => ({ hostView: 'LUCKY_DRAW', luckyDraws: [draw, ...(cur.luckyDraws || [])].slice(0, 10) }));
    logEvent('DRAW', `Team lucky draw${draw.title ? ` (${draw.title})` : ''}: ${team.name}`, { teamId: team.id });
    return team.id;
  };

  // Auctioneer correction: reopen the last sold/unsold player (a sale is undone and the team refunded),
  // with the winning bid still standing so bidding can continue from there
  const reopenLastPlayer = () => {
    const lastId = liveState.lastDecidedId;
    const target = auctionPlayers.find(p => p.id === lastId);
    if (!target || (target.status !== 'SOLD' && target.status !== 'UNSOLD')) {
      showNotice('There is no previous player to go back to.');
      return false;
    }
    setPlayers(prev => prev.map(p => {
      if (p.id === target.id) {
        return target.status === 'SOLD'
          ? { ...p, status: 'CURRENT', currentBid: p.soldPrice, highestBidderTeamId: p.soldToTeamId, soldToTeamId: null, soldPrice: null }
          : { ...p, status: 'CURRENT', currentBid: p.basePrice, highestBidderTeamId: null };
      }
      if (p.auctionId === activeAuctionId && p.status === 'CURRENT') {
        return { ...p, status: 'UPCOMING', currentBid: p.basePrice, highestBidderTeamId: null };
      }
      return p;
    }));
    updateLive({ currentPlayerId: target.id, lastDecidedId: null, shuffleAt: null });
    logEvent('REOPEN', `${target.name} is back on the table${target.status === 'SOLD' ? ` (sale to ${teamName(target.soldToTeamId)} undone)` : ''}`, { playerId: target.id });
    showNotice(`${target.name} is back on the table.`, 'info');
    return true;
  };

  // Start another round with every unsold player
  const reauctionAllUnsold = () => {
    const unsold = auctionPlayers.filter(p => p.status === 'UNSOLD');
    if (unsold.length === 0) {
      showNotice('There are no unsold players.');
      return 0;
    }
    const ids = new Set(unsold.map(p => p.id));
    setPlayers(prev => prev.map(p => ids.has(p.id) ? { ...p, status: 'UPCOMING', currentBid: p.basePrice } : p));
    logEvent('ROUND', `Re-auction round: ${unsold.length} unsold players back in the queue`);
    showNotice(`${unsold.length} unsold players are back in the queue.`, 'info');
    return unsold.length;
  };

  // Put a player on the bidding floor (UPCOMING or UNSOLD for a re-auction round)
  const selectPlayerForAuction = (playerId, { shuffle = false } = {}) => {
    const target = auctionPlayers.find(p => p.id === playerId);
    if (!target) return false;
    if (activeLock.locked) {
      showNotice(lockedMessage);
      return false;
    }
    if (target.status === 'SOLD') {
      showNotice(`${target.name} is already sold. Release them from the squad before re-auctioning.`);
      return false;
    }
    if (target.id === currentPlayer?.id && target.status === 'CURRENT') return true;

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, status: 'CURRENT', currentBid: p.basePrice, highestBidderTeamId: null, soldToTeamId: null, soldPrice: null };
      }
      // A player left on the floor without a decision goes back to the queue
      if (p.auctionId === activeAuctionId && p.status === 'CURRENT') {
        return { ...p, status: 'UPCOMING', currentBid: p.basePrice, highestBidderTeamId: null };
      }
      return p;
    }));
    // shuffleAt tells host screens to play the random-draw animation before revealing the player
    updateLive({ currentPlayerId: playerId, shuffleAt: shuffle ? Date.now() : null });
    return true;
  };

  // Queue order: upcoming players by set number, then unsold players for the re-auction round
  const auctionQueue = [
    ...auctionPlayers.filter(p => p.status === 'UPCOMING').sort((a, b) => (a.setNo || 0) - (b.setNo || 0)),
    ...(activeAuction?.unsoldPolicy === 'REMOVE'
      ? []
      : auctionPlayers.filter(p => p.status === 'UNSOLD').sort((a, b) => (a.setNo || 0) - (b.setNo || 0)))
  ];

  // Random draw: a random upcoming player from the lowest remaining set; once all are done, a random unsold player
  const pickRandomPlayer = (category) => {
    const onlyCategory = typeof category === 'string' && category ? category : null;
    const pool = auctionQueue.filter(p => p.id !== currentPlayer?.id && (!onlyCategory || p.category === onlyCategory));
    if (pool.length === 0) {
      showNotice('No players left in the queue. Auction complete!', 'info');
      return false;
    }
    const upcoming = pool.filter(p => p.status === 'UPCOMING');
    const lowestSet = Math.min(...upcoming.map(p => p.setNo || 0));
    const candidates = upcoming.length ? upcoming.filter(p => (p.setNo || 0) === lowestSet) : pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return selectPlayerForAuction(pick.id, { shuffle: true });
  };

  const loadNextPlayer = (category) => {
    const onlyCategory = typeof category === 'string' && category ? category : null;
    if (runSettings.playerOrder === 'RANDOM') return pickRandomPlayer(onlyCategory);
    const next = auctionQueue.find(p => p.id !== currentPlayer?.id && (!onlyCategory || p.category === onlyCategory));
    if (!next) {
      showNotice('No players left in the queue. Auction complete!', 'info');
      return false;
    }
    return selectPlayerForAuction(next.id);
  };

  // Admin correction: return a sold player to the pool and refund the team
  const releasePlayer = (playerId) => {
    if (!guardSetup()) return false;
    setPlayers(prev => prev.map(p => p.id === playerId
      ? { ...p, status: 'UNSOLD', currentBid: p.basePrice, highestBidderTeamId: null, soldToTeamId: null, soldPrice: null }
      : p));
  };

  const setHostView = (hostView) => updateLive({ hostView });

  // Change a run setting (clock, same-team raise, player order, host design) for the open auction
  const setRunSetting = (key, value) => {
    if (!RUN_SETTING_KEYS.includes(key) || !activeAuctionId) return false;
    return editAuction(activeAuctionId, { [key]: value });
  };

  // ---------- Plans & Force Pulse requests ----------
  // An organiser asks Force Pulse for a bigger auction: either upgrading an existing auction
  // (auctionId) or a brand-new managed auction (auctionId null, with title / teamsWanted).
  const requestUnlock = ({ auctionId = activeAuctionId, planId, phone = '', message = '', title = '', teamsWanted = 0, startDate = '' }) => {
    const auction = auctionId ? auctions.find(a => a.id === auctionId) : null;
    if (!currentUser || (auctionId && !auction)) return false;
    const teamCount = auction ? getAuctionLock(auctionId).teamCount : 0;
    const wanted = Number(teamsWanted) || teamCount;
    setUnlockRequests(prev => [
      {
        id: `req-${Date.now()}`,
        auctionId: auction?.id || null,
        auctionTitle: auction?.title || title.trim() || 'New auction',
        ownerEmail: currentUser.email,
        ownerName: currentUser.name || currentUser.email,
        teamCount,
        teamsWanted: wanted,
        startDate,
        planId: planId || planForTeams(Math.max(wanted, FREE_PLAN.teamLimit + 1)).id,
        phone,
        message,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      // one open request per auction: a new one replaces the pending one
      ...prev.filter(r => !(auction && r.auctionId === auction.id && r.status === 'PENDING'))
    ]);
    return true;
  };

  const setAuctionPlan = (auctionId, planId) => {
    if (!isSuperAdmin) return false;
    const plan = getPlan(planId);
    setAuctions(prev => prev.map(a => a.id === auctionId
      ? { ...a, plan: plan.id, teamLimit: plan.teamLimit, managedByForcePulse: plan.id !== FREE_PLAN.id || !!a.managedByForcePulse }
      : a));
    return true;
  };

  // Approve: upgrades the auction, or creates the requested auction for the organiser. Returns the auction id.
  const resolveUnlockRequest = (requestId, approve, planId) => {
    if (!isSuperAdmin) return null;
    const request = unlockRequests.find(r => r.id === requestId);
    if (!request) return null;
    const grantedPlan = planId || request.planId;
    let auctionId = request.auctionId;
    if (approve) {
      if (auctionId) {
        setAuctionPlan(auctionId, grantedPlan);
      } else {
        auctionId = createAuction({
          title: request.auctionTitle,
          ownerEmail: request.ownerEmail,
          plan: grantedPlan,
          sport: 'Cricket',
          status: 'UPCOMING',
          startDate: request.startDate ? new Date(request.startDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
          purseLimit: 100,
          minSquadSize: 15,
          maxSquadSize: 25,
          maxOverseas: 8,
          assignedAdmin: request.ownerName,
          description: request.message || ''
        });
      }
    }
    setUnlockRequests(prev => prev.map(r => r.id === requestId
      ? { ...r, auctionId, status: approve ? 'APPROVED' : 'REJECTED', planId: grantedPlan, resolvedAt: new Date().toISOString() }
      : r));
    return auctionId;
  };

  // ---------- Force Pulse admin: users & assignment ----------
  const createUserAccount = async ({ name, email, password, orgName }) => {
    if (!isSuperAdmin) return { success: false, error: 'Only Force Pulse admins can create accounts.' };
    try {
      await api('/api/users', { method: 'POST', body: { name, email, password, orgName } });
      await refreshUsers();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const assignAuction = (auctionId, ownerEmail) => {
    if (!isSuperAdmin) return false;
    const email = ownerEmail.trim().toLowerCase();
    const owner = users.find(u => u.email.toLowerCase() === email);
    setAuctions(prev => prev.map(a => a.id === auctionId
      ? { ...a, ownerEmail: email, assignedAdmin: owner?.name || a.assignedAdmin }
      : a));
    return true;
  };

  // ---------- Controller-tab automation ----------
  const registerController = useCallback(() => {
    setControllerCount(c => c + 1);
    return () => setControllerCount(c => c - 1);
  }, []);

  const latest = useRef({});
  latest.current = { sellPlayer, markPlayerUnsold, placeBid, canTeamBid, teams, currentPlayer, activeAuction };

  // Simulated bot bidders for demos
  useEffect(() => {
    if (!isController || !autoBotBidding || currentPlayer?.status !== 'CURRENT') return;
    const interval = setInterval(() => {
      const { teams: ts, currentPlayer: cp, activeAuction: auc, canTeamBid: canBid, placeBid: bid } = latest.current;
      if (!cp || cp.status !== 'CURRENT' || Math.random() < 0.35) return;
      const amount = getNextBidAmount(auc, cp);
      const eligible = ts.filter(t => t.id !== cp.highestBidderTeamId && canBid(t.id, amount, cp).ok);
      if (eligible.length === 0) return;
      bid(eligible[Math.floor(Math.random() * eligible.length)].id, amount);
    }, 2500);
    return () => clearInterval(interval);
  }, [isController, autoBotBidding, currentPlayer?.id, currentPlayer?.status]);

  // ---------- Sound & celebration effects (every tab, including the host screen) ----------
  // The stream overlay stays silent and clean: its pixels and audio go straight into the broadcast.
  const lastSeen = useRef({ playerId: null, status: null, bidId: null });
  useEffect(() => {
    if (IS_OVERLAY_WINDOW) return;
    const prev = lastSeen.current;
    const topBid = bidHistory[0]?.id || null;
    if (currentPlayer && prev.playerId === currentPlayer.id) {
      if (prev.status === 'CURRENT' && currentPlayer.status === 'SOLD') {
        soundManager.playSoldSound();
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      } else if (prev.status === 'CURRENT' && currentPlayer.status === 'UNSOLD') {
        soundManager.playUnsoldSound();
      } else if (topBid && topBid !== prev.bidId && bidHistory[0].playerId === currentPlayer.id) {
        soundManager.playBidSound();
      }
    }
    lastSeen.current = { playerId: currentPlayer?.id || null, status: currentPlayer?.status || null, bidId: topBid };
  }, [currentPlayer?.id, currentPlayer?.status, bidHistory]);

  const toggleSound = () => {
    const enabled = soundManager.toggleSound();
    setIsSoundMuted(!enabled);
  };

  // ---------- Auction / team / player management ----------
  // Organisers get a free (2-team) auction; only Force Pulse can set a paid plan or create it for another user
  const createAuction = (auctionData) => {
    const newId = `auc-${Date.now()}`;
    const { teamCount: rawTeamCount = 0, ...data } = auctionData;
    const teamCount = Math.max(0, Math.floor(Number(rawTeamCount) || 0));
    if (!isSuperAdmin && teamCount > FREE_PLAN.teamLimit) {
      showNotice(`Free auctions have up to ${FREE_PLAN.teamLimit} teams. Ask Force Pulse for a bigger auction.`);
      return null;
    }
    // Force Pulse picks the plan (at least big enough for the teams); organisers are on the free plan
    const chosen = getPlan(data.plan);
    const plan = isSuperAdmin ? (chosen.teamLimit >= teamCount ? chosen : planForTeams(teamCount)) : FREE_PLAN;
    const ownerEmail = ((isSuperAdmin && data.ownerEmail) || currentUser?.email || '').trim().toLowerCase() || null;
    const purse = Number(data.purseLimit || 100);
    if (teamCount > 0) {
      const stamp = Date.now();
      setTeams(prev => [...prev, ...Array.from({ length: teamCount }, (_, i) => ({
        id: `team-${stamp}-${i + 1}`,
        auctionId: newId,
        name: `Team ${i + 1}`,
        shortCode: `T${i + 1}`,
        logo: DEFAULT_TEAM_LOGO,
        initialPurse: purse,
        owner: '',
        coach: ''
      }))]);
    }
    setAuctions(prev => [{
      bidIncrements: DEFAULT_BID_INCREMENTS.map(s => ({ ...s, maxPrice: s.maxPrice === Infinity ? 1000 : s.maxPrice })),
      categories: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'],
      ...data,
      id: newId,
      plan: plan.id,
      teamLimit: plan.teamLimit,
      managedByForcePulse: isSuperAdmin,
      publicPageEnabled: isSuperAdmin,
      ownerEmail,
      createdBy: currentUser?.name || 'Admin User',
      assignedAdmin: data.assignedAdmin || currentUser?.name || 'Admin User'
    }, ...prev]);
    setActiveAuctionId(newId);
    return newId;
  };

  // Organisers can always open/close their auction (status); rule changes on managed auctions need Force Pulse
  const editAuction = (auctionId, updatedRules) => {
    const auction = auctions.find(a => a.id === auctionId);
    const onlyRunSettings = Object.keys(updatedRules).every(k => RUN_SETTING_KEYS.includes(k));
    if (!isSuperAdmin && !onlyRunSettings && isManagedAuction(auction)) {
      showNotice(SETUP_DENIED);
      return false;
    }
    const { plan: _p, teamLimit: _t, managedByForcePulse: _m, ownerEmail: _o, publicPageEnabled: _pub, ...safe } = updatedRules;
    setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, ...(isSuperAdmin ? updatedRules : safe) } : a));
    return true;
  };

  const deleteAuction = (auctionId) => {
    const auction = auctions.find(a => a.id === auctionId);
    const ownsIt = auction && currentUser && (auction.ownerEmail || '').toLowerCase() === currentUser.email.toLowerCase();
    if (!isSuperAdmin && !(ownsIt && !isManagedAuction(auction))) return false;
    setAuctions(prev => prev.filter(a => a.id !== auctionId));
    setTeams(prev => prev.filter(t => t.auctionId !== auctionId));
    setPlayers(prev => prev.filter(p => p.auctionId !== auctionId));
    setLive(prev => {
      const { [auctionId]: _removed, ...rest } = prev;
      return rest;
    });
    return true;
  };

  // Team limit: organisers stop at their plan and ask Force Pulse; a Force Pulse admin adding
  // more teams moves the auction up to the plan that fits.
  const makeRoomForTeams = (extra) => {
    const needed = teams.length + extra;
    if (needed <= activeLock.teamLimit) return true;
    if (!isSuperAdmin) {
      showNotice(`The ${activeLock.plan.name} plan allows ${activeLock.teamLimit} teams. Request Force Pulse to set up a bigger auction.`);
      return false;
    }
    setAuctionPlan(activeAuctionId, planForTeams(needed).id);
    return true;
  };

  const newTeam = (data, i = 0) => {
    const { purseRemaining: _ignored, spent: _s, squadCount: _c, overseasCount: _o, ...rest } = data;
    return {
      ...rest,
      id: `team-${Date.now()}-${i}`,
      auctionId: activeAuctionId,
      initialPurse: Number(rest.initialPurse || activeAuction?.purseLimit || 100)
    };
  };

  const addTeam = (teamData) => {
    if (!activeAuctionId || !guardSetup() || !makeRoomForTeams(1)) return false;
    setTeams(prev => [...prev, newTeam(teamData)]);
    return true;
  };

  // Bulk upload (Force Pulse admin)
  const importTeams = (list) => {
    if (!activeAuctionId || !isSuperAdmin || list.length === 0 || !makeRoomForTeams(list.length)) return 0;
    setTeams(prev => [...prev, ...list.map(newTeam)]);
    return list.length;
  };

  // Purse remaining is derived from sold players, so editing a team never wipes what it has spent
  const editTeam = (teamId, updatedData) => {
    if (!guardSetup()) return false;
    const { purseRemaining: _ignored, spent: _s, squadCount: _c, overseasCount: _o, ...data } = updatedData;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...data } : t));
    return true;
  };

  // Deleting a team returns its squad to the pool
  const deleteTeam = (teamId) => {
    if (!guardSetup()) return false;
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setPlayers(prev => prev.map(p => {
      if (p.soldToTeamId === teamId) {
        return { ...p, status: 'UNSOLD', currentBid: p.basePrice, highestBidderTeamId: null, soldToTeamId: null, soldPrice: null };
      }
      if (p.highestBidderTeamId === teamId && p.status === 'CURRENT') {
        return { ...p, currentBid: p.basePrice, highestBidderTeamId: null };
      }
      return p;
    }));
    return true;
  };

  const newPlayer = (playerData, i = 0) => ({
    ...playerData,
    id: `ply-${Date.now()}-${i}`,
    auctionId: activeAuctionId,
    status: 'UPCOMING',
    currentBid: Number(playerData.basePrice),
    highestBidderTeamId: null,
    soldToTeamId: null,
    soldPrice: null
  });

  const addPlayer = (playerData) => {
    if (!activeAuctionId || !guardSetup()) return false;
    setPlayers(prev => [...prev, newPlayer(playerData)]);
    return true;
  };

  // Bulk upload (Force Pulse admin)
  const importPlayers = (list) => {
    if (!activeAuctionId || !isSuperAdmin || list.length === 0) return 0;
    setPlayers(prev => [...prev, ...list.map(newPlayer)]);
    // Categories used in the file become auction categories
    const known = activeAuction.categories || [];
    const extra = [...new Set(list.map(p => p.category).filter(c => c && !known.includes(c)))];
    if (extra.length) editAuction(activeAuctionId, { categories: [...known, ...extra] });
    return list.length;
  };

  const editPlayer = (playerId, updatedData) => {
    if (!guardSetup()) return false;
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const next = { ...p, ...updatedData };
      // Keep the opening bid in step with a changed base price while no one has bid
      if (!next.highestBidderTeamId && next.status !== 'SOLD') next.currentBid = Number(next.basePrice);
      return next;
    }));
    return true;
  };

  const deletePlayer = (playerId) => {
    if (!guardSetup()) return false;
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    return true;
  };

  const calculateTeamCharges = (teamCount = 0) => {
    const freeLimit = TEAM_PRICING_CONFIG.FREE_TEAMS_LIMIT;
    const pricePerExtra = TEAM_PRICING_CONFIG.PRICE_PER_EXTRA_TEAM;
    const paidTeams = Math.max(0, teamCount - freeLimit);
    return {
      totalTeams: teamCount,
      freeTeams: Math.min(teamCount, freeLimit),
      paidTeams,
      pricePerExtra,
      totalCharges: paidTeams * pricePerExtra
    };
  };

  return (
    <AuctionContext.Provider
      value={{
        loaded,
        currentUser,
        users,
        isSuperAdmin,
        myAuctions,
        getAuctionLock,
        activeLock,
        unlockRequests,
        requestUnlock,
        resolveUnlockRequest,
        setAuctionPlan,
        canSetup,
        createUserAccount,
        assignAuction,
        importTeams,
        importPlayers,
        hostView: liveState.hostView,
        shuffleAt: liveState.shuffleAt || null,
        runSettings,
        setRunSetting,
        pickRandomPlayer,
        reopenLastPlayer,
        reauctionAllUnsold,
        sellToRandomTeam,
        runLuckyDraw,
        logEvent,
        auctionEvents: liveState.events || [],
        luckyDraws: liveState.luckyDraws || [],
        lastDecidedId: liveState.lastDecidedId || null,
        setHostView,
        loginUser,
        registerUser,
        requestPasswordReset,
        resetPassword,
        logoutUser,
        role,
        setRole,
        activeAuctionId,
        setActiveAuctionId,
        activeAuction,
        auctions,
        teams,
        allTeams,
        players: auctionPlayers,
        allPlayers: players,
        currentPlayer,
        auctionQueue,
        bidHistory,
        nextBidAmount,
        askingBid,
        setAskingBid,
        autoBotBidding,
        setAutoBotBidding,
        isSoundMuted,
        toggleSound,
        notice,
        showNotice,
        placeBid,
        undoLastBid,
        canTeamBid,
        getTeamMaxBid,
        sellPlayer,
        markPlayerUnsold,
        selectPlayerForAuction,
        loadNextPlayer,
        releasePlayer,
        registerController,
        createAuction,
        editAuction,
        deleteAuction,
        addTeam,
        editTeam,
        deleteTeam,
        addPlayer,
        editPlayer,
        deletePlayer,
        calculateTeamCharges,
        TEAM_PRICING_CONFIG
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);
