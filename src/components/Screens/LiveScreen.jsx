import React, { useEffect, useRef, useState } from 'react';
import { useAuction, getBidIncrement } from '../../context/AuctionContext';
import { HostScreen } from './HostScreen';
import { LoginModal } from '../Auth/LoginModal';
import { screenUrl } from '../Admin/ScreensManager';
import { Menu, ChevronDown, Play, X } from 'lucide-react';
import { formatMoney } from '../../services/money';

// Auctioneer's all-in-one live screen: the host screen for the audience plus a control bar at the bottom.
// Before the auction starts it shows "Bidding yet to start" and a Start Auction button.

const BAR_H = 60;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

// Amounts are stored in crores; the control bar shows and takes full rupee figures (1.5 -> 1,50,00,000)
const CRORE = 10000000;
const toRupees = (cr) => Math.round(Number(cr) * CRORE);
const formatRupees = (cr) => toRupees(cr).toLocaleString('en-IN');
const parseRupees = (text) => Number(String(text).replace(/[^\d]/g, '')) / CRORE;

const VIEWS = [
  ['AUTO', 'Live Bidding'],
  ['TEAMS', 'Teams'],
  ['SOLD', 'Sold Players'],
  ['UNSOLD', 'Unsold Players'],
  ['UPCOMING', 'All Players'],
  ['LUCKY_DRAW', 'Team Lucky Draw'],
  ['UPDATES', 'Auction Updates']
];

const StatsDialog = ({ kind, players, onClose }) => {
  const sold = players.filter(p => p.status === 'SOLD');
  const avg = (list) => list.length ? round2(list.reduce((s, p) => s + Number(p.soldPrice || 0), 0) / list.length) : 0;
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{kind === 'CATEGORY' ? 'Average price by category' : 'Overall average price'}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        {kind === 'CATEGORY' ? (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="text-left py-1">Category</th><th className="text-right py-1">Sold</th><th className="text-right py-1">Average</th><th className="text-right py-1">Highest</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(c => {
                const list = sold.filter(p => p.category === c);
                return (
                  <tr key={c}>
                    <td className="py-2 font-bold">{c}</td>
                    <td className="py-2 text-right">{list.length}</td>
                    <td className="py-2 text-right">{list.length ? formatMoney(avg(list)) : '—'}</td>
                    <td className="py-2 text-right">{list.length ? formatMoney(Math.max(...list.map(p => p.soldPrice))) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-100 p-3"><div className="text-2xl font-black">{sold.length}</div><div className="text-xs font-bold uppercase text-slate-500">Sold</div></div>
            <div className="rounded-xl bg-lime-100 p-3"><div className="text-2xl font-black">{formatMoney(avg(sold))}</div><div className="text-xs font-bold uppercase text-slate-500">Avg</div></div>
            <div className="rounded-xl bg-slate-100 p-3"><div className="text-2xl font-black">{formatMoney(sold.reduce((s, p) => s + Number(p.soldPrice || 0), 0))}</div><div className="text-xs font-bold uppercase text-slate-500">Total</div></div>
          </div>
        )}
      </div>
    </div>
  );
};

const ControlBar = () => {
  const {
    activeAuction, currentPlayer, players, teams, nextBidAmount, placeBid, canTeamBid, sellPlayer, markPlayerUnsold,
    loadNextPlayer, selectPlayerForAuction, undoLastBid, reopenLastPlayer, reauctionAllUnsold, runSettings, setRunSetting,
    editAuction, setAskingBid, toggleSound, isSoundMuted, notice, showNotice, lastDecidedId, bidHistory, activeLock,
    sellToRandomTeam, runLuckyDraw, logEvent
  } = useAuction();
  const [lookupMode, setLookupMode] = useState('SERIAL');
  const [lookup, setLookup] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(formatRupees(nextBidAmount));
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const menuRef = useRef(null);

  const isLive = currentPlayer?.status === 'CURRENT';
  const started = activeAuction.status === 'LIVE' && !!currentPlayer;
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))];
  const ordered = [...players].sort((a, b) => (a.setNo || 0) - (b.setNo || 0));

  // The amount box follows the next valid bid whenever the bid or player changes
  useEffect(() => { setAmount(formatRupees(nextBidAmount)); }, [nextBidAmount, currentPlayer?.id]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // Bids go in at the auction's precision (1 lakh), so round what was typed the same way
  const amt = round2(parseRupees(amount));
  const step = getBidIncrement(activeAuction, amt || nextBidAmount);
  // Changing the amount also shows it on every host screen as the asking bid
  const setAmountCr = (cr) => {
    setAmount(formatRupees(cr));
    setAskingBid(cr > nextBidAmount ? cr : null);
  };

  const loadByLookup = (e) => {
    e.preventDefault();
    const v = lookup.trim().replace(/^#/, '');
    if (!v) return;
    // Letters in the box: search by player name (exact name first, otherwise the one name containing it)
    if (/[a-z]/i.test(v) && !players.some(p => p.id === v)) {
      const q = v.toLowerCase();
      const exact = players.filter(p => p.name.toLowerCase() === q);
      const matches = exact.length ? exact : players.filter(p => p.name.toLowerCase().includes(q));
      if (matches.length !== 1) {
        showNotice(matches.length ? `${matches.length} players match "${v}": ${matches.slice(0, 4).map(p => p.name).join(', ')}. Type more of the name.` : `No player named "${v}".`);
        return;
      }
      if (selectPlayerForAuction(matches[0].id)) setLookup('');
      return;
    }
    const target = lookupMode === 'SERIAL'
      ? ordered[Number(v) - 1]
      : players.find(p => p.id === v || p.id.replace(/\D/g, '').endsWith(v));
    if (!target) {
      showNotice(lookupMode === 'SERIAL' ? `No player with serial #${v}.` : `No player with id ${v}.`);
      return;
    }
    if (selectPlayerForAuction(target.id)) setLookup('');
  };

  const start = () => {
    if (activeAuction.status !== 'LIVE') {
      editAuction(activeAuction.id, { status: 'LIVE' });
      logEvent('START', `${activeAuction.title}: auction started`);
    }
    if (!isLive) loadNextPlayer(category);
  };

  const menuItems = [
    ['Undo last bid', () => undoLastBid(), !isLive || !bidHistory.some(b => b.playerId === currentPlayer?.id)],
    ['Back to previous player', () => reopenLastPlayer(), !lastDecidedId],
    ['Re-auction all unsold', () => reauctionAllUnsold(), !players.some(p => p.status === 'UNSOLD')],
    ['Sold to random team', () => {
      if (window.confirm(`Give ${currentPlayer?.name} to a random team at the base price (${formatMoney(currentPlayer?.basePrice)})?`)) sellToRandomTeam();
    }, !isLive || !!currentPlayer?.highestBidderTeamId],
    ['Team lucky draw', () => runLuckyDraw(window.prompt('What is the draw for? (optional, e.g. "First pick")') || ''), teams.length === 0],
    [runSettings.playerOrder === 'RANDOM' ? 'Shuffle players: on' : 'Shuffle players: off', () => setRunSetting('playerOrder', runSettings.playerOrder === 'RANDOM' ? 'SEQUENTIAL' : 'RANDOM'), false],
    ['Category avg price', () => setStats('CATEGORY'), false],
    ['Overall avg price', () => setStats('OVERALL'), false],
    [isSoundMuted ? 'Unmute sounds' : 'Mute sounds', () => toggleSound(), false],
    ['Open full controller', () => window.open(screenUrl('controller', activeAuction.id), `fp-controller-${activeAuction.id}`), false]
  ];

  const field = 'h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900';

  return (
    <>
      {notice && (
        <div role="status" className={`fixed left-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2 text-sm font-bold shadow-xl ${notice.type === 'error' ? 'bg-red-600 text-white' : 'bg-lime-500 text-slate-950'}`} style={{ bottom: BAR_H + 10 }}>
          {notice.text}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 overflow-x-auto border-t border-slate-300 bg-slate-200 px-2" style={{ height: BAR_H }}>
        {!started ? (
          <>
            <button onClick={start} disabled={activeLock.locked} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-400">
              <Play className="w-4 h-4" /> Start Auction
            </button>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Start with category" className={field}>
              <option value="">Default</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        ) : (
          <>
            <form onSubmit={loadByLookup} className="flex items-center gap-1.5 shrink-0">
              <label className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                <input type="radio" name="lookup" checked={lookupMode === 'SERIAL'} onChange={() => setLookupMode('SERIAL')} /> #
              </label>
              <label className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                <input type="radio" name="lookup" checked={lookupMode === 'ID'} onChange={() => setLookupMode('ID')} /> id
              </label>
              <input value={lookup} onChange={(e) => setLookup(e.target.value)} list="fp-player-names" placeholder="Serial / id / name" aria-label="Load player by serial, id or name" className={`${field} w-40`} />
              <datalist id="fp-player-names">
                {players.filter(p => p.status !== 'SOLD').map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </form>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category for next player" className={`${field} shrink-0`}>
              <option value="">Default</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => loadNextPlayer(category)} className="h-10 shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700">New</button>

            <div className={`${field} flex w-40 shrink-0 items-center gap-1`}>
              <span className="font-bold text-slate-500">Rs</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
                onBlur={() => setAmountCr(amt || nextBidAmount)}
                aria-label="Bid amount (rupees)"
                className="w-full min-w-0 bg-transparent font-bold outline-none"
              />
            </div>
            <button onClick={() => setAmountCr(round2((amt || nextBidAmount) + step))} disabled={!isLive} title="Raise by the auction's bid step" className="h-10 shrink-0 rounded-lg border border-blue-300 bg-blue-100 px-2.5 text-sm font-bold text-blue-700 disabled:opacity-40">+{formatRupees(step)}</button>
            <button onClick={() => setAmountCr(Math.max(nextBidAmount, round2((amt || nextBidAmount) - step)))} disabled={!isLive || amt <= nextBidAmount} title="Lower by the auction's bid step" className="h-10 shrink-0 rounded-lg border border-red-300 bg-red-100 px-2.5 text-sm font-bold text-red-700 disabled:opacity-40">−{formatRupees(step)}</button>

            <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Bid for team">
              {teams.map(t => {
                const check = isLive ? canTeamBid(t.id, amt) : { ok: false };
                const leading = t.id === currentPlayer?.highestBidderTeamId;
                return (
                  <button
                    key={t.id}
                    onClick={() => placeBid(t.id, amt)}
                    disabled={!isLive || !check.ok || amt < nextBidAmount}
                    title={check.ok ? `${t.name} bids ${formatMoney(amt)}` : (check.reason || t.name)}
                    className={`h-10 min-w-10 rounded-full px-2.5 text-xs font-black ${leading ? 'bg-lime-500 text-slate-950 ring-2 ring-lime-700' : 'bg-amber-400 text-slate-950 hover:bg-amber-300'} disabled:bg-slate-300 disabled:text-slate-500`}
                  >
                    {t.shortCode}
                  </button>
                );
              })}
            </div>

            <span className="flex-1" />
            <button onClick={() => sellPlayer()} disabled={!isLive || !currentPlayer?.highestBidderTeamId} className="h-10 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-emerald-300">Sold</button>
            <button onClick={() => markPlayerUnsold()} disabled={!isLive} className="h-10 shrink-0 rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700 disabled:bg-red-300">Unsold</button>
          </>
        )}

        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="More actions" className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 hover:bg-white">
            <Menu className="w-5 h-5" /><ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="fixed right-2 w-60 rounded-xl border border-slate-200 bg-white py-1.5 text-sm text-slate-800 shadow-2xl" style={{ bottom: BAR_H + 4 }}>
              {menuItems.map(([label, fn, disabled]) => (
                <button key={label} disabled={disabled} onClick={() => { fn(); setMenuOpen(false); }} className="block w-full px-4 py-2 text-left hover:bg-slate-50 disabled:text-slate-300">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {stats && <StatsDialog kind={stats} players={players} onClose={() => setStats(null)} />}
    </>
  );
};

// Top-right menu: what the screen shows (also switches every other host screen)
const ViewMenu = () => {
  const { hostView, setHostView } = useAuction();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-3 right-3 z-30">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Screen view" className="rounded-xl bg-white px-4 py-2.5 text-slate-800 shadow-lg hover:bg-slate-50">
        <Menu className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white py-1.5 text-sm text-slate-800 shadow-2xl">
          {VIEWS.map(([id, label]) => (
            <button key={id} onClick={() => { setHostView(id); setOpen(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50">
              <span className={`w-1.5 h-1.5 rounded-full ${(hostView || 'AUTO') === id ? 'bg-slate-900' : 'bg-transparent'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const LiveScreen = () => {
  const { currentUser, myAuctions, activeAuctionId, registerController, currentPlayer, selectPlayerForAuction, setHostView } = useAuction();
  const [showLogin, setShowLogin] = useState(false);
  const allowed = currentUser && myAuctions.some(a => a.id === activeAuctionId);

  useEffect(() => (allowed ? registerController() : undefined), [allowed, registerController]);

  // Raised hand on an Unsold / Yet-to-auction card: put that player on the table and switch to live bidding
  const pickPlayer = (p) => {
    const onTable = currentPlayer?.status === 'CURRENT' && currentPlayer.highestBidderTeamId;
    if (onTable && !window.confirm(`${currentPlayer.name} has bids on the table. Put them back in the queue and take ${p.name} instead?`)) return;
    if (selectPlayerForAuction(p.id)) setHostView('AUTO');
  };

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-extrabold text-slate-900">Live auction screen</h1>
          <p className="text-sm text-slate-500">
            {currentUser ? "This account doesn't manage this auction." : 'Sign in with the organiser account to run this auction.'}
          </p>
          <button onClick={() => setShowLogin(true)} className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-black text-slate-950">
            {currentUser ? 'Switch account' : 'Sign in'}
          </button>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </main>
    );
  }

  return (
    <>
      <HostScreen bottomInset={BAR_H} rightGap onPickPlayer={pickPlayer} />
      <ViewMenu />
      <ControlBar />
    </>
  );
};
