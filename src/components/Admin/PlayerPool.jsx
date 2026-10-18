import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Search, Gavel, Radio } from 'lucide-react';
import { formatMoney } from '../../services/money';

const STATUS_FILTERS = [
  ['AVAILABLE', 'Available', p => p.status === 'UPCOMING' || p.status === 'UNSOLD' || p.status === 'CURRENT'],
  ['SOLD', 'Sold', p => p.status === 'SOLD'],
  ['ALL', 'All', () => true]
];

const STATUS_STYLE = {
  UPCOMING: 'bg-blue-50 text-blue-700',
  CURRENT: 'bg-lime-100 text-lime-800',
  SOLD: 'bg-emerald-50 text-emerald-700',
  UNSOLD: 'bg-red-50 text-red-700'
};

// Auctioneer's player pool: find a player by serial number, name or category and put them on the table
export const PlayerPool = () => {
  const { players, teams, currentPlayer, selectPlayerForAuction, activeLock } = useAuction();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [category, setCategory] = useState('ALL');

  // Serial number = lot number on the host screen (auction order: set, then list order)
  const ordered = [...players].sort((a, b) => (a.setNo || 0) - (b.setNo || 0));
  const serialOf = new Map(ordered.map((p, i) => [p.id, i + 1]));
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))];

  const q = query.trim().toLowerCase().replace(/^#/, '');
  const statusTest = STATUS_FILTERS.find(([id]) => id === statusFilter)[2];
  const matches = (p) => {
    if (!q) return true;
    if (/^\d+$/.test(q)) return String(serialOf.get(p.id)) === q || String(serialOf.get(p.id)).startsWith(q);
    return [p.name, p.category, p.role, p.country].some(v => (v || '').toLowerCase().includes(q));
  };
  const list = ordered.filter(p => statusTest(p) && (category === 'ALL' || p.category === category) && matches(p));

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 space-y-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Player Pool</h3>
          <span className="text-xs font-bold text-slate-400">{list.length} shown</span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Serial no., name or category…"
            aria-label="Search player pool"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Pool status">
          {STATUS_FILTERS.map(([id, label, test]) => (
            <button
              key={id}
              role="tab"
              aria-selected={statusFilter === id}
              onClick={() => setStatusFilter(id)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${statusFilter === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label} <span className={statusFilter === id ? 'text-lime-400' : 'text-slate-400'}>{players.filter(test).length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
          {['ALL', ...categories].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${category === c ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              {c === 'ALL' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <ul className="max-h-[34rem] overflow-y-auto divide-y divide-slate-100">
        {list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No players match.</li>}
        {list.map(p => {
          const onTable = p.id === currentPlayer?.id && p.status === 'CURRENT';
          const soldTo = p.status === 'SOLD' ? teams.find(t => t.id === p.soldToTeamId) : null;
          return (
            <li key={p.id} className={`flex items-center gap-3 p-3 ${onTable ? 'bg-lime-50' : 'hover:bg-slate-50'}`}>
              <div className="relative shrink-0">
                <img src={p.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                <span className="absolute -top-1.5 -left-1.5 rounded-md bg-slate-900 px-1.5 text-[10px] font-black text-white">#{serialOf.get(p.id)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-900">{p.name}</div>
                <div className="truncate text-[11px] font-medium text-slate-500">
                  {p.category} · {p.country}{p.isOverseas ? ' ✈' : ''} · Base {formatMoney(p.basePrice)}
                </div>
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-600'}`}>
                  {onTable ? 'On the table' : p.status === 'SOLD' ? `Sold · ${soldTo?.shortCode || ''} ${formatMoney(p.soldPrice)}` : p.status}
                </span>
              </div>
              {onTable ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-lime-500 px-2.5 py-2 text-[11px] font-black uppercase text-slate-950">
                  <Radio className="w-3.5 h-3.5" /> Live
                </span>
              ) : (
                <button
                  onClick={() => selectPlayerForAuction(p.id)}
                  disabled={p.status === 'SOLD' || activeLock.locked}
                  title={p.status === 'SOLD' ? 'Already sold' : `Put ${p.name} on the table for live bidding`}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-2 text-[11px] font-black uppercase text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Gavel className="w-3.5 h-3.5" /> Put on table
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
