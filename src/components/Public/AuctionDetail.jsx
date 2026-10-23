import React, { useEffect, useState } from 'react';
import { useAuction, isPublicAuction } from '../../context/AuctionContext';
import { ArrowLeft, ArrowRight, Calendar, Trophy, Users, Wallet, Globe2, Clock, Gavel } from 'lucide-react';
import { Badge, Card, Stat, StatusBadge, Stripes, Tabs } from '../ui';
import { LiveSpotlight } from './LiveAuctionViewer';
import { TeamsBoard } from './TeamsBoard';
import { PlayerCatalog } from './PlayerCatalog';
import { LiveUpdates } from './LiveUpdates';
import { formatMoney } from '../../services/money';

// Width the public auction page is laid out at on every device (phones zoom out to show the same view)
const DESKTOP_WIDTH = 1280;

const TAB_LABELS = { ARENA: 'Live Arena', UPDATES: 'Updates', OVERVIEW: 'Overview', RESULTS: 'Sold & Unsold', SQUADS: 'Teams', PLAYERS: 'Players' };

// Results and squads appear as soon as the first player is sold or unsold, whatever the auction's status,
// so the public page follows the auction live
const tabsFor = (status, started) => {
  const ids = status === 'LIVE' ? ['ARENA', 'RESULTS', 'PLAYERS', 'UPDATES']
    : status === 'UPCOMING' ? ['OVERVIEW', ...(started ? ['UPDATES', 'RESULTS', 'SQUADS'] : []), 'PLAYERS']
    : ['RESULTS', 'SQUADS', 'UPDATES', 'PLAYERS'];
  return ids.map(id => [id, TAB_LABELS[id]]);
};

const Countdown = ({ startDate }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = new Date(startDate).getTime() - now;
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) {
    return <p className="text-sm font-bold text-lime-700">Bidding is about to begin. Stay on this page.</p>;
  }
  const parts = [
    ['Days', Math.floor(diff / 86400000)],
    ['Hours', Math.floor(diff / 3600000) % 24],
    ['Min', Math.floor(diff / 60000) % 60],
    ['Sec', Math.floor(diff / 1000) % 60]
  ];
  return (
    <div className="flex gap-3">
      {parts.map(([label, value]) => (
        <div key={label} className="w-20 rounded-2xl bg-slate-900 py-3 text-center text-white">
          <div className="font-mono text-3xl font-black text-lime-400">{String(value).padStart(2, '0')}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
};

const UpcomingOverview = ({ auction, teams, players }) => {
  const byCategory = (auction.categories || []).map(c => [c, players.filter(p => p.category === c).length]);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <Clock className="w-5 h-5 text-lime-600" /> Bidding starts in
        </h2>
        <Countdown startDate={auction.startDate} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900">Participating teams ({teams.length})</h3>
          {teams.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Teams will be announced soon.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <img src={t.logo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  <div className="min-w-0">
                    <div className="truncate font-extrabold text-sm text-slate-900">{t.name} <span className="text-slate-400">({t.shortCode})</span></div>
                    <div className="text-xs text-slate-500">Purse {formatMoney(t.initialPurse)}{t.coach ? ` · Coach ${t.coach}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900">Player pool ({players.length})</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {byCategory.map(([cat, n]) => (
              <li key={cat} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">{cat}</span>
                <strong className="text-slate-900">{n}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const PastResults = ({ teams, players }) => {
  const sold = players.filter(p => p.status === 'SOLD').sort((a, b) => b.soldPrice - a.soldPrice);
  const unsoldList = players.filter(p => p.status === 'UNSOLD');
  const unsold = unsoldList.length;
  const remaining = players.filter(p => p.status === 'UPCOMING' || p.status === 'CURRENT').length;
  const total = Math.round(sold.reduce((s, p) => s + Number(p.soldPrice || 0), 0) * 10000) / 10000;
  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Players sold', sold.length], ['Unsold', unsold], ['Yet to be auctioned', remaining], ['Total spend', formatMoney(total)]].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
            <div className="font-bebas text-4xl leading-none text-slate-950">{value}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Trophy className="w-4 h-4 text-amber-500" /> Sold players ({sold.length})</h3>
          {sold.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No players sold yet.</p>
          ) : (
            <ol className="mt-4 space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {sold.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                  <span className="w-6 text-center font-black text-slate-400">{i + 1}</span>
                  <img src={p.image} alt="" className="w-9 h-9 rounded-full object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-slate-900">{p.name}</div>
                    <div className="truncate text-xs text-slate-500">{p.category} · {teamName(p.soldToTeamId)}</div>
                  </div>
                  <strong className="text-sm text-lime-700">{formatMoney(p.soldPrice)}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm overflow-x-auto">
          <h3 className="font-extrabold text-slate-900">Team spend summary</h3>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr><th className="py-2">Team</th><th className="py-2 text-right">Players</th><th className="py-2 text-right">Spent</th><th className="py-2 text-right">Left</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map(t => (
                <tr key={t.id}>
                  <td className="py-2.5 font-bold text-slate-900">{t.name}</td>
                  <td className="py-2.5 text-right">{t.squadCount}</td>
                  <td className="py-2.5 text-right">{formatMoney(t.spent)}</td>
                  <td className="py-2.5 text-right text-emerald-600 font-bold">{formatMoney(t.purseRemaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {teams.length === 0 && <p className="mt-3 text-sm text-slate-500">No teams took part.</p>}
        </div>
      </div>

      {unsold > 0 && (
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900">Unsold players ({unsold})</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unsoldList.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                <img src={p.image} alt="" className="w-9 h-9 rounded-full object-cover object-top" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-slate-900">{p.name}</div>
                  <div className="truncate text-xs text-slate-500">{p.category} · Base {formatMoney(p.basePrice)}</div>
                </div>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">UNSOLD</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AuctionDetail = ({ onBack }) => {
  const { activeAuction: auction, teams, players } = useAuction();
  const started = players.some(p => p.status === 'SOLD' || p.status === 'UNSOLD');
  const tabs = tabsFor(auction?.status, started);
  const [tab, setTab] = useState(tabs[0][0]);

  // Status and progress change while the page is open (e.g. the organiser takes it live)
  useEffect(() => {
    if (!tabs.some(([id]) => id === tab)) setTab(tabs[0][0]);
  }, [auction?.status, started]);

  // Phones see this page exactly as a computer does: the browser lays it out at desktop width and zooms out to fit.
  // The site's normal phone layout comes back on leaving the page.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return undefined;
    const before = meta.getAttribute('content');
    meta.setAttribute('content', `width=${DESKTOP_WIDTH}`);
    return () => meta.setAttribute('content', before);
  }, []);

  if (!auction) return null;
  if (!isPublicAuction(auction)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">This auction's public page is not available yet</h2>
        <p className="text-sm text-slate-500">The organiser's auction is waiting for verification by Force Pulse.</p>
        <button onClick={onBack} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Browse auctions</button>
      </div>
    );
  }

  const date = new Date(auction.startDate);
  const rules = [
    [Wallet, 'Purse / team', formatMoney(auction.purseLimit)],
    auction.maxBidPerPlayer > 0 && [Gavel, 'Max bid / player', formatMoney(auction.maxBidPerPlayer)],
    [Users, 'Squad size', auction.minSquadSize === auction.maxSquadSize ? auction.maxSquadSize : `${auction.minSquadSize}–${auction.maxSquadSize}`],
    [Globe2, 'Max overseas', auction.maxOverseas],
    [Trophy, 'Teams · Players', `${teams.length} · ${players.length}`]
  ].filter(Boolean);

  return (
    <div className="space-y-8 pb-20">

      {/* Auction header: banner behind, title and the rules that matter */}
      <section className="relative -mt-6 w-screen ml-[calc(50%-50vw)] overflow-hidden bg-slate-950 text-white">
        {auction.banner && <img src={auction.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <Stripes />
        <div className="absolute -right-24 -top-32 w-96 h-96 rounded-full bg-lime-500/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pb-10 space-y-6">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-lime-400">
            <ArrowLeft className="w-4 h-4" /> All auctions
          </button>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-5">
              {auction.tournamentLogo && <img src={auction.tournamentLogo} alt="" className="hidden sm:block w-24 h-24 rounded-xl bg-white object-contain p-1.5" />}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={auction.status} />
                  <Badge tone="glass">{auction.sport}</Badge>
                </div>
                <h1 className="font-bebas text-5xl leading-[0.9] sm:text-7xl">{auction.title}</h1>
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-400">
                  <Calendar className="w-4 h-4" />
                  {Number.isNaN(date.getTime()) ? 'Date to be announced' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  {auction.assignedAdmin && <> · Organised by {auction.assignedAdmin}</>}
                </p>
              </div>
            </div>
            {auction.registrationOpen && (
              <a href={`#/register/${encodeURIComponent(auction.id)}`} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-lime-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-lime-400">
                Register as a player <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {auction.description && <p className="max-w-3xl text-slate-300">{auction.description}</p>}

          <div className={`grid grid-cols-2 gap-3 ${rules.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
            {rules.map(([Icon, label, value]) => <Stat key={label} dark icon={Icon} label={label} value={value} />)}
          </div>
        </div>
      </section>

      {/* Live auction: the bidding spotlight stays on top whatever tab is open below */}
      {auction.status === 'LIVE' && <LiveSpotlight />}

      {/* Section tabs, kept in view while scrolling */}
      <div className="sticky top-16 z-30 -mx-4 bg-slate-50/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <Tabs items={tabs.map(([id, label]) => ({ id, label }))} value={tab} onChange={setTab} className="sm:inline-flex" />
      </div>

      {tab === 'ARENA' && <TeamsBoard />}
      {tab === 'UPDATES' && <LiveUpdates />}
      {tab === 'OVERVIEW' && <UpcomingOverview auction={auction} teams={teams} players={players} />}
      {tab === 'RESULTS' && <PastResults teams={teams} players={players} />}
      {tab === 'SQUADS' && <TeamsBoard />}
      {tab === 'PLAYERS' && <PlayerCatalog />}
    </div>
  );
};
