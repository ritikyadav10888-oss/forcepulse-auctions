import React, { useEffect, useRef, useState } from 'react';
import { useAuction, getBidIncrement, useSecondsLeft } from '../../context/AuctionContext';
import { HostScreen, useNewLuckyDraw } from './HostScreen';
import { useTeamBidKeys } from '../../hooks/useTeamBidKeys';
import { LoginModal } from '../Auth/LoginModal';
import { Menu, ChevronDown, Play, X, Clock, Undo2, ArrowLeft } from 'lucide-react';
import { formatMoney } from '../../services/money';

// Auctioneer's all-in-one live screen: the host screen for the audience plus a control bar at the bottom.
// Before the auction starts it shows "Bidding yet to start" and a Start Auction button.

const BAR_H = 60;
const CALM_KEY = 'fp_live_calm';
const CLOCK_SECONDS = 30;
const round2 = (n) => Math.round(Number(n) * 10000) / 10000;

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
  ['UPDATES', 'Auction Updates'],
  ['TITLE', 'Title only']
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

// Ctrl+J: jump the bid straight to an amount typed in lakh ("2" = 2 Lakh, "2.5" = 2.5 Lakh). It becomes the asking
// bid shown on every screen, and the team buttons then bid it; it can't be below the next valid bid.
const JumpDialog = ({ nextBid, onJump, onClose }) => {
  const [text, setText] = useState('');
  const lakh = Number(text.replace(/,/g, ''));
  const cr = text.trim() !== '' && Number.isFinite(lakh) && lakh > 0 ? round2(lakh / 100) : null;
  const tooLow = cr !== null && cr < nextBid;
  const submit = (e) => {
    e.preventDefault();
    if (cr === null || tooLow) return;
    onJump(cr);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label="Jump bid" onSubmit={submit} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-600 bg-slate-800 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Jump bid to</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-500 bg-slate-900 px-4 focus-within:border-emerald-400">
          <input
            autoFocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            aria-label="Amount in lakh"
            className="h-16 w-full min-w-0 bg-transparent text-4xl font-black tabular-nums outline-none"
          />
          <span className="text-xl font-black uppercase text-slate-400">Lakh</span>
        </label>
        <p className={`min-h-[1.25rem] text-sm font-bold ${tooLow ? 'text-rose-300' : 'text-slate-400'}`}>
          {tooLow ? `Must be at least ${formatMoney(nextBid)} (the next bid)` : cr !== null ? `Screens will show ${formatMoney(cr)} · ${formatRupees(cr)}` : `Next bid is ${formatMoney(nextBid)}. Type 2 for 2 Lakh.`}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-slate-600 px-4 text-sm font-bold text-slate-200 hover:bg-slate-700">Cancel</button>
          <button type="submit" disabled={cr === null || tooLow} className="h-11 rounded-lg bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500">Jump (Enter)</button>
        </div>
      </form>
    </div>
  );
};

const ControlBar = ({ onHeight, onAmount, calm, onCalm, arrange }) => {
  const {
    activeAuction, currentPlayer, players, teams, nextBidAmount, placeBid, sellPlayer, markPlayerUnsold,
    loadNextPlayer, selectPlayerForAuction, undoLastBid, reopenLastPlayer, reauctionAllUnsold, runSettings, setRunSetting,
    editAuction, setAskingBid, toggleSound, isSoundMuted, notice, showNotice, lastDecidedId, bidHistory, activeLock,
    sellToRandomTeam, runLuckyDraw, logEvent, lowerBasePrice, restoreBasePrice, bidClock, startBidClock, stopBidClock, isSuperAdmin
  } = useAuction();
  const [lookupMode, setLookupMode] = useState('SERIAL');
  const [lookup, setLookup] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(formatRupees(nextBidAmount));
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const menuRef = useRef(null);
  const barRef = useRef(null);
  const [barH, setBarH] = useState(BAR_H);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setBarH(h);
      onHeight?.(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  const isLive = currentPlayer?.status === 'CURRENT';
  // Bid clock is shared: every host screen shows it while it runs; each bid restarts it
  const clockLeft = useSecondsLeft(bidClock);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' || navigator.onLine !== false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
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
  // The screen's team tiles bid this same amount, as typed (no need to leave the box first)
  useEffect(() => { onAmount?.(amt); }, [amt, onAmount]);
  const step = getBidIncrement(activeAuction, amt || nextBidAmount, currentPlayer);
  // Changing the amount also shows it on every host screen as the asking bid
  const setAmountCr = (cr) => {
    setAmount(formatRupees(cr));
    setAskingBid(cr > nextBidAmount ? cr : null);
  };

  const raiseAmount = () => isLive && setAmountCr(round2((amt || nextBidAmount) + step));
  const lowerAmount = () => isLive && setAmountCr(Math.max(nextBidAmount, round2((amt || nextBidAmount) - step)));

  // Jumps (Ctrl+J) can be undone one by one, back to the amount before each jump, until a team bids;
  // a bid or a new player clears them
  const [jumps, setJumps] = useState([]);
  useEffect(() => { setJumps([]); }, [nextBidAmount, currentPlayer?.id]);
  const jumpTo = (cr) => {
    setJumps(list => [...list, amt || nextBidAmount]);
    setAmountCr(cr);
  };
  const undoJump = () => {
    if (!jumps.length) return;
    const prev = jumps[jumps.length - 1];
    setJumps(list => list.slice(0, -1));
    setAmountCr(Math.max(nextBidAmount, prev));
  };
  // Typing a table number bids the amount in the box for that team (5 = table 5, 1 then 2 = table 12), +/- step
  // the amount, Backspace / Ctrl+Z undoes a waiting jump first, then the last bid. Views switch from the top-right menu.
  // typedTable: the table number typed so far, while the keys wait for a possible second digit
  const [typedTable, setTypedTable] = useState(null);
  useTeamBidKeys(teams, {
    onBid: (team) => placeBid(team.id, amt),
    onUndo: () => (jumps.length ? undoJump() : undoLastBid()),
    onRaise: raiseAmount,
    onLower: lowerAmount,
    onPending: setTypedTable,
    onMiss: (typed) => showNotice(`No team at table ${typed}.`)
  });

  // Ctrl+J opens the jump dialog (works even with the cursor in a box)
  const [jumpOpen, setJumpOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (isLive) setJumpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLive]);
  useEffect(() => { if (!isLive) setJumpOpen(false); }, [isLive]);

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

  // The player just sold / marked unsold can be put back on the table (the team gets its purse back)
  const lastDecided = players.find(p => p.id === lastDecidedId && (p.status === 'SOLD' || p.status === 'UNSOLD'));
  const undoDecision = () => {
    if (!lastDecided) return;
    const onTable = isLive && currentPlayer?.highestBidderTeamId && currentPlayer.id !== lastDecided.id;
    if (onTable && !window.confirm(`${currentPlayer.name} has bids on the table. Put them back in the queue and bring back ${lastDecided.name}?`)) return;
    reopenLastPlayer();
  };

  const menuItems = [
    ['Undo last bid (Backspace)', () => undoLastBid(), !isLive || !(currentPlayer?.highestBidderTeamId || bidHistory.some(b => b.playerId === currentPlayer?.id))],
    [lastDecided ? `Undo ${lastDecided.status === 'SOLD' ? 'sold' : 'unsold'}: ${lastDecided.name} back on the table` : 'Back to previous player', undoDecision, !lastDecided],
    ...(Number(activeAuction.reducedBasePrice) > 0 ? [[`No bids: lower base to ${formatMoney(activeAuction.reducedBasePrice)}`, () => lowerBasePrice(), !isLive || !!currentPlayer?.highestBidderTeamId || Number(currentPlayer?.basePrice) <= Number(activeAuction.reducedBasePrice)]] : []),
    ...(isLive && Number(currentPlayer?.originalBasePrice) > Number(currentPlayer?.basePrice) ? [[`No bids: back to base ${formatMoney(currentPlayer.originalBasePrice)}`, () => restoreBasePrice(), !!currentPlayer.highestBidderTeamId]] : []),
    ['Re-auction all unsold', () => reauctionAllUnsold(), !players.some(p => p.status === 'UNSOLD')],
    ['Sold to random team', () => {
      if (window.confirm(`Give ${currentPlayer?.name} to a random team at the base price (${formatMoney(currentPlayer?.basePrice)})?`)) sellToRandomTeam();
    }, !isLive || !!currentPlayer?.highestBidderTeamId],
    ['Team lucky draw', () => runLuckyDraw(window.prompt('What is the draw for? (optional, e.g. "First pick")') || ''), teams.length === 0],
    [runSettings.playerOrder === 'RANDOM' ? 'Shuffle players: on' : 'Shuffle players: off', () => setRunSetting('playerOrder', runSettings.playerOrder === 'RANDOM' ? 'SEQUENTIAL' : 'RANDOM'), false],
    ['Category avg price', () => setStats('CATEGORY'), false],
    ['Overall avg price', () => setStats('OVERALL'), false],
    [isSoundMuted ? 'Unmute sounds' : 'Mute sounds', () => toggleSound(), false],
    [calm ? 'Calm view: on (no motion, plain background)' : 'Calm view: off (same as the hall screen)', () => onCalm?.(!calm), false],
    [arrange?.on ? 'Done arranging tiles' : 'Arrange team tiles (drag to move, renumbers tables)', () => arrange?.toggle(), false]
  ];

  // Dark, low-glare controls for an operator who sits at this screen for hours: no white surfaces, muted fills,
  // colour only where it means something (green = sold / leading, red = unsold)
  const field = 'h-11 rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-slate-100 placeholder:text-slate-500';
  const plain = 'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800';
  const divider = <span className="h-8 w-px shrink-0 bg-slate-700" />;

  // Back to this auction's page in the dashboard. This tab has never been on the dashboard, so tell it
  // (the same per-tab keys the dashboard keeps across a refresh) which auction to open, then load it.
  const backToAuction = () => {
    const keys = isSuperAdmin
      ? { 'fp:role': 'ADMIN', 'fp:admin:section': 'AUCTIONS', 'fp:admin:setup': activeAuction.id, 'fp:admin:form': null }
      : { 'fp:role': 'ADMIN', 'fp:dash:open': activeAuction.id, 'fp:dash:form': null };
    try {
      Object.entries(keys).forEach(([k, v]) => (v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v))));
    } catch {}
    window.location.href = window.location.pathname;
  };

  return (
    <>
      {notice && (
        <div role="status" className={`fixed left-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2 text-sm font-bold shadow-xl ${notice.type === 'error' ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-100 ring-1 ring-slate-500'}`} style={{ bottom: barH + 10 }}>
          {notice.text}
        </div>
      )}

      {/* Always the same order, left to right: player · amount · (teams above) · result · extras */}
      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-2 border-t border-slate-700 bg-slate-900 px-2 py-2 text-slate-100" style={{ minHeight: BAR_H }}>
        <button onClick={backToAuction} title="Back to this auction's page (teams, players, settings)" aria-label="Back to the auction page" className={plain}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {!started ? (
          <>
            <button onClick={start} disabled={activeLock.locked} className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-600 disabled:bg-slate-700">
              <Play className="w-4 h-4" /> Start Auction
            </button>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Start with category" className={field}>
              <option value="">Default</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        ) : (
          <>
            {/* 1. Player */}
            <form onSubmit={loadByLookup} className="flex items-center gap-1.5 shrink-0">
              <label className="inline-flex items-center gap-1 text-sm font-bold text-slate-400">
                <input type="radio" name="lookup" checked={lookupMode === 'SERIAL'} onChange={() => setLookupMode('SERIAL')} /> #
              </label>
              <label className="inline-flex items-center gap-1 text-sm font-bold text-slate-400">
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
            <button onClick={() => loadNextPlayer(category)} className="h-11 shrink-0 rounded-lg bg-sky-800 px-4 text-sm font-bold text-white hover:bg-sky-700">Next player</button>

            {divider}
            {/* 2. Amount: − box + */}
            <button onClick={lowerAmount} disabled={!isLive || amt <= nextBidAmount} title="Lower by the auction's bid step (key - or Down)" className={plain}>−{formatRupees(step)}</button>
            <div className={`${field} flex w-44 shrink-0 items-center`}>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
                onBlur={() => setAmountCr(amt || nextBidAmount)}
                aria-label="Bid amount"
                className="w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums outline-none"
              />
            </div>
            <button onClick={raiseAmount} disabled={!isLive} title="Raise by the auction's bid step (key + or Up)" className={plain}>+{formatRupees(step)}</button>
            <button onClick={() => setJumpOpen(true)} disabled={!isLive} title="Jump the bid to any amount in lakh (Ctrl+J)" className={plain}>Jump <span className="text-xs text-slate-400">Ctrl+J</span></button>
            {typedTable && (
              <span role="status" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-sky-500 bg-sky-950 px-3 text-sm font-bold text-sky-100">
                Table {typedTable}… <span className="text-xs text-sky-300">Enter</span>
              </span>
            )}
            {isLive && jumps.length > 0 && (
              <button onClick={undoJump} title={`Back to ${formatMoney(Math.max(nextBidAmount, jumps[jumps.length - 1]))} (Backspace)`} className={`${plain} !border-amber-600 text-amber-200`}>
                <Undo2 className="w-4 h-4" /> Undo jump
              </button>
            )}

            <span className="flex-1" />
            {/* 3. Result */}
            <button onClick={() => sellPlayer()} disabled={!isLive || !currentPlayer?.highestBidderTeamId} className="h-11 shrink-0 rounded-lg bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500">Sold</button>
            <button onClick={() => markPlayerUnsold()} disabled={!isLive} className="h-11 shrink-0 rounded-lg bg-rose-800 px-5 text-lg font-bold text-white hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500">Unsold</button>
            {lastDecided && (
              <button
                onClick={undoDecision}
                title={`Put ${lastDecided.name} back on the table${lastDecided.status === 'SOLD' ? ` (sale for ${formatMoney(lastDecided.soldPrice)} cancelled, purse returned)` : ''}`}
                className={plain}
              >
                <Undo2 className="w-4 h-4" /> Undo {lastDecided.status === 'SOLD' ? 'Sold' : 'Unsold'}
              </button>
            )}
            {divider}
            <button
              onClick={() => (bidClock ? stopBidClock() : startBidClock(CLOCK_SECONDS))}
              disabled={!isLive}
              title={clockLeft === null ? `Start a ${CLOCK_SECONDS}s bid clock on every screen (restarts on every bid)` : 'Stop the clock'}
              className={`${plain} min-w-11 text-lg ${clockLeft !== null && clockLeft <= 5 ? '!border-red-500 !bg-red-700 text-white' : ''}`}
            >
              {clockLeft === null ? <Clock className="w-5 h-5" /> : clockLeft}
            </button>
          </>
        )}

        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="More actions" className={plain}>
            <Menu className="w-5 h-5" /><ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="fixed right-2 w-72 rounded-xl border border-slate-600 bg-slate-800 py-1.5 text-sm text-slate-100 shadow-2xl" style={{ bottom: barH + 4 }}>
              {menuItems.map(([label, fn, disabled]) => (
                <button key={label} disabled={disabled} onClick={() => { fn(); setMenuOpen(false); }} className="block w-full px-4 py-2 text-left hover:bg-slate-700 disabled:text-slate-500 disabled:hover:bg-transparent">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1" aria-label={`${online ? 'Online' : 'Offline'}${isLive ? ', bidding open' : ''}`}>
          <span title={online ? 'Connected' : 'Offline'} className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          <span title={isLive ? 'Bidding open' : 'No player up'} className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-orange-500' : 'bg-slate-600'}`} />
        </div>
      </div>
      {stats && <StatsDialog kind={stats} players={players} onClose={() => setStats(null)} />}
      {jumpOpen && <JumpDialog nextBid={nextBidAmount} onJump={jumpTo} onClose={() => setJumpOpen(false)} />}
    </>
  );
};

// Top-right menu: what this Live Screen shows (host screens keep their own view)
const ViewMenu = ({ view, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-3 right-3 z-30">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Screen view" className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-200 shadow-lg hover:bg-slate-700">
        <Menu className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-600 bg-slate-800 py-1.5 text-sm text-slate-100 shadow-2xl">
          {VIEWS.map(([id, label]) => (
            <button key={id} onClick={() => { onChange(id); setOpen(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-700">
              <span className={`w-1.5 h-1.5 rounded-full ${view === id ? 'bg-emerald-400' : 'bg-transparent'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const LiveScreen = () => {
  const [barH, setBarH] = useState(BAR_H);
  const { currentUser, myAuctions, activeAuctionId, registerController, currentPlayer, selectPlayerForAuction, luckyDraws, nextBidAmount, placeBid, canTeamBid, teams, editTeam } = useAuction();
  // What this Live Screen shows; changing it does not change any host screen
  const [view, setView] = useState('AUTO');
  useNewLuckyDraw(luckyDraws, () => setView('LUCKY_DRAW'));
  const [showLogin, setShowLogin] = useState(false);
  const allowed = currentUser && myAuctions.some(a => a.id === activeAuctionId);
  // Calm view (on unless turned off in the bar's menu): this screen drops the moving backdrop and glows the hall
  // screens use, for an operator watching it for hours. Remembered in this browser.
  // Arrange mode: drag a team tile onto another to move it there. Positions are table numbers, so every team
  // is renumbered by its new place (first tile = T1 = key 1 ...), saved to the auction, and every screen follows.
  const [arranging, setArranging] = useState(false);
  const arrange = {
    on: arranging,
    toggle: () => setArranging(v => !v),
    move: (fromId, toId) => {
      const ids = teams.map(t => t.id).filter(id => id !== fromId);
      ids.splice(ids.indexOf(toId) + (teams.findIndex(t => t.id === fromId) < teams.findIndex(t => t.id === toId) ? 1 : 0), 0, fromId);
      ids.forEach((id, i) => {
        const team = teams.find(t => t.id === id);
        if (Number(team.tableNo) !== i + 1) editTeam(id, { tableNo: i + 1 });
      });
    }
  };

  const [calm, setCalmState] = useState(() => {
    try { return localStorage.getItem(CALM_KEY) !== 'off'; } catch { return true; }
  });
  const setCalm = (on) => {
    setCalmState(on);
    try { localStorage.setItem(CALM_KEY, on ? 'on' : 'off'); } catch {}
  };

  useEffect(() => (allowed ? registerController() : undefined), [allowed, registerController]);

  // Raised hand on an Unsold / Yet-to-auction card: put that player on the table and switch to live bidding
  // Team tiles on the screen are bid buttons: the amount is the next bid, or the higher amount raised in the bar
  // Team tiles bid the amount in the bar's box (typed or stepped); never below the next valid bid
  const barAmount = useRef(0);
  const [shownAmount, setShownAmount] = useState(0);
  const tileAmount = () => Math.max(nextBidAmount, barAmount.current || 0);
  const setBarAmount = useRef((v) => { barAmount.current = v; setShownAmount(v); }).current;
  const bidFromTile = (t) => placeBid(t.id, tileAmount());
  const tileCanBid = (t) => canTeamBid(t.id, tileAmount());

  const pickPlayer = (p) => {
    const onTable = currentPlayer?.status === 'CURRENT' && currentPlayer.highestBidderTeamId;
    if (onTable && !window.confirm(`${currentPlayer.name} has bids on the table. Put them back in the queue and take ${p.name} instead?`)) return;
    if (selectPlayerForAuction(p.id)) setView('AUTO');
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
      <HostScreen forcedView={view} bottomInset={barH} rightGap onPickPlayer={pickPlayer} viewKeys={false} onTeamBid={bidFromTile} canBid={tileCanBid} tileBid={Math.max(nextBidAmount, shownAmount || 0)} calm={calm} arrange={arrange} />
      <ViewMenu view={view} onChange={setView} />
      <ControlBar onHeight={setBarH} onAmount={setBarAmount} calm={calm} onCalm={setCalm} arrange={arrange} />
      {arranging && (
        <div className="fixed left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-sky-500 bg-slate-900 px-4 py-2 text-sm font-bold text-sky-100 shadow-2xl">
          Drag a team tile to its new place · table numbers and keys follow the place (first = T1) · bidding is paused
          <button onClick={() => setArranging(false)} className="rounded-lg bg-sky-700 px-3 py-1.5 font-black text-white hover:bg-sky-600">Done</button>
        </div>
      )}
    </>
  );
};
