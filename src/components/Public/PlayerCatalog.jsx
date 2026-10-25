import React, { useState } from 'react';
import { PlayerPhoto } from '../PlayerPhoto';
import { useAuction } from '../../context/AuctionContext';
import { Search, Trophy, CheckCircle2, XCircle, Clock, Plane } from 'lucide-react';
import { formatMoney } from '../../services/money';
import { Badge, EmptyState, Tabs } from '../ui';

const isUpcoming = (p) => p.status === 'UPCOMING' || p.status === 'CURRENT';
const matchesStatus = (p, status) => status === 'ALL' || (status === 'UPCOMING' ? isUpcoming(p) : p.status === status);

const STATUS_BADGE = {
  SOLD: <Badge tone="gold">Sold</Badge>,
  UNSOLD: <Badge tone="danger">Unsold</Badge>,
  CURRENT: <Badge tone="live">On the floor</Badge>,
  UPCOMING: <Badge tone="neutral">Upcoming</Badge>
};

// Players tab: every player in the pool, filtered by status and category, as trading-card tiles
export const PlayerCatalog = () => {
  const { players, teams, activeAuction } = useAuction();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['ALL', ...(activeAuction?.categories || ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'])];
  const statuses = [
    { id: 'ALL', label: 'All', icon: Trophy, count: players.length },
    { id: 'SOLD', label: 'Sold', icon: CheckCircle2, count: players.filter(p => p.status === 'SOLD').length },
    { id: 'UNSOLD', label: 'Unsold', icon: XCircle, count: players.filter(p => p.status === 'UNSOLD').length },
    { id: 'UPCOMING', label: 'Upcoming', icon: Clock, count: players.filter(isUpcoming).length }
  ];
  const q = searchTerm.toLowerCase();
  const inCategory = (p, cat) => cat === 'ALL' || p.category.toLowerCase() === cat.toLowerCase();
  // Listed A to Z by name
  const filteredPlayers = [...players].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' })).filter(p => matchesStatus(p, statusFilter) && inCategory(p, categoryFilter)
    && [p.name, p.role, p.country].some(v => (v || '').toLowerCase().includes(q)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs items={statuses} value={statusFilter} onChange={setStatusFilter} />
        <label className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Search name, role or country…" aria-label="Search players" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-white py-2.5 pl-9 pr-3 text-sm ring-1 ring-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-lime-500" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => {
          const selected = categoryFilter === cat;
          const count = players.filter(p => matchesStatus(p, statusFilter) && inCategory(p, cat)).length;
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)} aria-pressed={selected}
              className={`rounded-md px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all ${selected ? 'bg-lime-500 text-slate-950' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'}`}>
              {cat === 'ALL' ? 'All categories' : cat} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {filteredPlayers.length === 0 ? (
        <EmptyState icon={Search} title="No players match" text="Try another status, category or search." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filteredPlayers.map(p => {
            const soldTeam = teams.find(t => t.id === p.soldToTeamId);
            return (
              <article key={p.id} className="group overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[4/3] bg-slate-900">
                  <PlayerPhoto src={p.image} alt={p.name} className={p.status === 'UNSOLD' ? 'grayscale opacity-60' : ''} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
                  <div className="absolute left-2 top-2">{STATUS_BADGE[p.status] || STATUS_BADGE.UPCOMING}</div>
                  <span className="absolute right-2 top-2 rounded bg-slate-950/80 px-1.5 py-0.5 text-[11px] font-black text-white">Set {p.setNo}</span>
                  <div className="absolute inset-x-3 bottom-2 text-white">
                    <h3 className="truncate font-bebas text-2xl leading-none">{p.name}</h3>
                    <p className="flex items-center gap-1 truncate text-xs font-semibold text-slate-300">{p.category}{p.isOverseas && <Plane className="w-3 h-3" />}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 p-3">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{p.status === 'SOLD' ? 'Sold for' : 'Base'}</span>
                    <span className={`font-bebas text-2xl leading-none ${p.status === 'SOLD' ? 'text-lime-700' : 'text-slate-950'}`}>{formatMoney(p.status === 'SOLD' ? p.soldPrice : p.basePrice)}</span>
                  </div>
                  {soldTeam && (
                    <span className="flex items-center gap-1.5 truncate text-xs font-extrabold text-slate-700">
                      <img src={soldTeam.logo} alt="" className="w-5 h-5 rounded object-cover" /> {soldTeam.shortCode}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
