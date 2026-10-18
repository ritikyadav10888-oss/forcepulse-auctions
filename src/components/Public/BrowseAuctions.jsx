import React, { useState } from 'react';
import { useAuction, isPublicAuction } from '../../context/AuctionContext';
import { ArrowLeft, ArrowRight, Calendar, Search, Users, Trophy, Wallet, Radio, Gavel, X } from 'lucide-react';
import { formatMoney } from '../../services/money';

// `active` styles the selected tab, `badge` its count bubble
const TABS = [
  { id: 'LIVE', label: 'Live', icon: Radio, active: 'bg-red-600 text-white', badge: 'bg-white/20 text-white' },
  { id: 'UPCOMING', label: 'Upcoming', icon: Calendar, active: 'bg-lime-500 text-slate-950', badge: 'bg-slate-950/10 text-slate-950' },
  { id: 'PAST', label: 'Past', icon: Trophy, active: 'bg-slate-900 text-white', badge: 'bg-white/20 text-white' }
];

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Date to be announced'
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const StatusBadge = ({ status }) => {
  if (status === 'LIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
        LIVE NOW
      </span>
    );
  }
  if (status === 'UPCOMING') {
    return <span className="rounded-full border border-lime-300 bg-lime-100 px-2.5 py-1 text-xs font-bold text-lime-900">UPCOMING</span>;
  }
  return <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">COMPLETED</span>;
};

// One auction tile, used on Browse Auctions and the home page's Featured section
export const AuctionCard = ({ auction: auc, onOpen }) => {
  const { allTeams, allPlayers } = useAuction();
  const teamCount = allTeams.filter(t => t.auctionId === auc.id).length;
  const pool = allPlayers.filter(p => p.auctionId === auc.id);
  const sold = pool.filter(p => p.status === 'SOLD');
  const spend = Math.round(sold.reduce((s, p) => s + Number(p.soldPrice || 0), 0) * 100) / 100;
  const topBuy = [...sold].sort((a, b) => b.soldPrice - a.soldPrice)[0];

  return (
    <button
      onClick={() => onOpen(auc.id)}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-lime-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
    >
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-700">
            {auc.sport}
          </span>
          <StatusBadge status={auc.status} />
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-lime-700 transition-colors">{auc.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(auc.startDate)}
          </p>
          {auc.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{auc.description}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>
            <span className="flex items-center gap-1 text-slate-400"><Users className="w-3 h-3" /> Teams</span>
            <span className="font-extrabold text-slate-900">{teamCount}</span>
          </div>
          <div>
            <span className="flex items-center gap-1 text-slate-400"><Trophy className="w-3 h-3" /> {auc.status === 'UPCOMING' ? 'Pool' : 'Sold'}</span>
            <span className="font-extrabold text-slate-900">{auc.status === 'UPCOMING' ? pool.length : `${sold.length}/${pool.length}`}</span>
          </div>
          <div>
            <span className="flex items-center gap-1 text-slate-400"><Wallet className="w-3 h-3" /> {auc.status === 'UPCOMING' ? 'Purse' : 'Spent'}</span>
            <span className="font-extrabold text-slate-900">{formatMoney(auc.status === 'UPCOMING' ? auc.purseLimit : spend)}</span>
          </div>
        </div>

        {auc.status === 'PAST' && topBuy && (
          <p className="text-xs text-slate-500">
            Top buy: <strong className="text-slate-800">{topBuy.name}</strong> · {formatMoney(topBuy.soldPrice)}
          </p>
        )}
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900 group-hover:text-lime-700 group-hover:gap-2.5 transition-all">
        {auc.status === 'LIVE' ? 'Watch live' : auc.status === 'UPCOMING' ? 'View details' : 'View results'}
        <ArrowRight className="w-4 h-4" />
      </span>
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
    .sort((a, b) => tab === 'PAST'
      ? new Date(b.startDate) - new Date(a.startDate)
      : new Date(a.startDate) - new Date(b.startDate));

  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-lime-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </button>
            <h1 className="font-bebas text-5xl sm:text-6xl leading-none tracking-wide">
              Browse <span className="text-lime-400">Auctions</span>
            </h1>
            <p className="max-w-md text-sm text-slate-300">Watch live bidding, preview upcoming drafts or check past results.</p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name or sport…"
              aria-label="Search auctions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Status tabs */}
      <div role="tablist" className="flex w-full sm:inline-flex sm:w-auto gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon, active, badge }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-3 sm:px-5 py-2.5 text-sm font-extrabold transition-all ${
                selected ? `${active} shadow-sm` : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {id === 'LIVE' && counts.LIVE > 0 ? (
                <span className="relative flex w-2 h-2">
                  <span className={`absolute inset-0 rounded-full animate-ping ${selected ? 'bg-white' : 'bg-red-500'}`} />
                  <span className={`relative w-2 h-2 rounded-full ${selected ? 'bg-white' : 'bg-red-600'}`} />
                </span>
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {label}
              <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-[11px] font-black ${selected ? badge : 'bg-slate-100 text-slate-500'}`}>
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-lime-400 flex items-center justify-center">
            {q ? <Search className="w-6 h-6" /> : <Gavel className="w-6 h-6" />}
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">
            {q ? `No results for "${search.trim()}"` : `No ${TABS.find(t => t.id === tab).label.toLowerCase()} auctions right now`}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {q ? 'Try a different name or sport.' : tab === 'LIVE' ? 'Nothing is on the bidding floor at the moment.' : 'Check back soon.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {q && (
              <button onClick={() => setSearch('')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                <X className="w-4 h-4" /> Clear search
              </button>
            )}
            {/* Point to the tabs that do have auctions */}
            {!q && TABS.filter(t => t.id !== tab && counts[t.id] > 0).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 hover:border-lime-400 hover:bg-white">
                See {t.label.toLowerCase()} ({counts[t.id]}) <ArrowRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(auc => <AuctionCard key={auc.id} auction={auc} onOpen={onOpenAuction} />)}
        </div>
      )}
    </div>
  );
};
