import React, { useState } from 'react';
import { useAuction, isPublicAuction, byPinned } from '../../context/AuctionContext';
import { ArrowLeft, ArrowRight, Calendar, Search, Users, Trophy, Wallet, Radio, Gavel, X } from 'lucide-react';
import { formatMoney } from '../../services/money';
import { Badge, StatusBadge, Stripes, Tabs, EmptyState, Button, LiveDot } from '../ui';

const TABS = [
  { id: 'LIVE', label: 'Live', icon: Radio },
  { id: 'UPCOMING', label: 'Upcoming', icon: Calendar },
  { id: 'PAST', label: 'Past', icon: Trophy }
];

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Date to be announced'
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export { StatusBadge };

// One auction tile, used on Browse Auctions and the home page's Featured section:
// a dark "ticket" header with the title, then the numbers on white
export const AuctionCard = ({ auction: auc, onOpen }) => {
  const { allTeams, allPlayers } = useAuction();
  const teamCount = allTeams.filter(t => t.auctionId === auc.id).length;
  const pool = allPlayers.filter(p => p.auctionId === auc.id);
  const sold = pool.filter(p => p.status === 'SOLD');
  const spend = Math.round(sold.reduce((s, p) => s + Number(p.soldPrice || 0), 0) * 10000) / 10000;
  const topBuy = [...sold].sort((a, b) => b.soldPrice - a.soldPrice)[0];
  const upcoming = auc.status === 'UPCOMING';

  return (
    <button
      onClick={() => onOpen(auc.id)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-lime-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
    >
      <div className="relative overflow-hidden bg-slate-950 p-5 text-white">
        <Stripes />
        {auc.banner && <img src={auc.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative flex items-center justify-between gap-2">
          <Badge tone="glass">{auc.sport}</Badge>
          <StatusBadge status={auc.status} />
        </div>
        <div className="relative mt-6 flex items-end gap-3">
          {auc.tournamentLogo && <img src={auc.tournamentLogo} alt="" className="w-12 h-12 shrink-0 rounded-lg bg-white object-contain p-1" />}
          <h3 className="font-bebas text-3xl leading-[0.95] group-hover:text-lime-400 transition-colors">{auc.title}</h3>
        </div>
        <p className="relative mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Calendar className="w-3.5 h-3.5" /> {formatDate(auc.startDate)}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          {[
            [Users, 'Teams', teamCount],
            [Trophy, upcoming ? 'Players' : 'Sold', upcoming ? pool.length : `${sold.length}/${pool.length}`],
            [Wallet, upcoming ? 'Purse' : 'Spent', formatMoney(upcoming ? auc.purseLimit : spend)]
          ].map(([Icon, label, value]) => (
            <div key={label} className="px-1">
              <span className="block text-lg font-extrabold tabular-nums text-slate-950">{value}</span>
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Icon className="w-3 h-3" /> {label}</span>
            </div>
          ))}
        </div>

        {auc.description && <p className="text-sm text-slate-600 line-clamp-2">{auc.description}</p>}
        {auc.status === 'PAST' && topBuy && (
          <p className="text-sm text-slate-600">Top buy: <strong className="text-slate-950">{topBuy.name}</strong> · {formatMoney(topBuy.soldPrice)}</p>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-950 group-hover:gap-2.5 group-hover:text-lime-700 transition-all">
          {auc.status === 'LIVE' ? 'Watch live' : upcoming ? 'View details' : 'View results'}
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
};

export const BrowseAuctions = ({ onBack, onOpenAuction }) => {
  const { auctions: allAuctions } = useAuction();
  // Only auctions Force Pulse has verified have a public page
  const auctions = allAuctions.filter(isPublicAuction);
  const counts = Object.fromEntries(TABS.map(t => [t.id, auctions.filter(a => a.status === t.id).length]));
  const [tab, setTab] = useState(() => TABS.find(t => counts[t.id] > 0)?.id || 'LIVE');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const list = auctions
    .filter(a => a.status === tab)
    .filter(a => !q || a.title.toLowerCase().includes(q) || (a.sport || '').toLowerCase().includes(q))
    .sort((a, b) => byPinned(a, b) || (tab === 'PAST'
      ? new Date(b.startDate) - new Date(a.startDate)
      : new Date(a.startDate) - new Date(b.startDate)));

  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <section className="relative -mt-6 w-screen ml-[calc(50%-50vw)] overflow-hidden bg-slate-950 text-white">
        <Stripes />
        <div className="absolute -right-24 -top-32 w-96 h-96 rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-lime-400 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </button>
            <h1 className="font-bebas text-6xl sm:text-7xl leading-[0.9]">
              Browse <span className="text-lime-400">auctions</span>
            </h1>
            <p className="max-w-md text-slate-300">Watch live bidding, preview upcoming drafts or check past results.</p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name or sport…"
              aria-label="Search auctions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white ring-1 ring-white/15 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>
        </div>
      </section>

      {/* Status tabs */}
      <Tabs
        className="sm:inline-flex"
        value={tab}
        onChange={setTab}
        items={TABS.map(({ id, label, icon }) => ({
          id,
          label: id === 'LIVE' && counts.LIVE > 0 ? <span className="flex items-center gap-2"><LiveDot className="bg-red-500" /> {label}</span> : label,
          icon: id === 'LIVE' && counts.LIVE > 0 ? undefined : icon,
          count: counts[id]
        }))}
      />

      {/* Cards */}
      {list.length === 0 ? (
        <EmptyState
          icon={q ? Search : Gavel}
          title={q ? `No results for "${search.trim()}"` : `No ${TABS.find(t => t.id === tab).label.toLowerCase()} auctions right now`}
          text={q ? 'Try a different name or sport.' : tab === 'LIVE' ? 'Nothing is on the bidding floor at the moment.' : 'Check back soon.'}
        >
          {q && <Button variant="dark" size="sm" onClick={() => setSearch('')}><X className="w-4 h-4" /> Clear search</Button>}
          {/* Point to the tabs that do have auctions */}
          {!q && TABS.filter(t => t.id !== tab && counts[t.id] > 0).map(t => (
            <Button key={t.id} variant="subtle" size="sm" onClick={() => setTab(t.id)}>
              See {t.label.toLowerCase()} ({counts[t.id]}) <ArrowRight className="w-4 h-4" />
            </Button>
          ))}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(auc => <AuctionCard key={auc.id} auction={auc} onOpen={onOpenAuction} />)}
        </div>
      )}
    </div>
  );
};
