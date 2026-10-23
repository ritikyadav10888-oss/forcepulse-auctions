import React, { useEffect, useRef, useState } from 'react';
import { useAuction, isManagedAuction } from '../../context/AuctionContext';
import { screenUrl } from '../Admin/ScreensManager';
import {
  Search, Filter, X, Calendar, Eye, Pencil, Radio, Users, MoreVertical, Monitor, Youtube, Link2, Trash2,
  Clock, CheckCircle2, Flag, Plus, ChevronLeft, ChevronRight, Lock
} from 'lucide-react';

const STATUS = {
  UPCOMING: { label: 'Yet to start', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
  LIVE: { label: 'Started', icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50' },
  PAST: { label: 'Completed', icon: Flag, cls: 'text-slate-600 bg-slate-100' }
};
const STATUS_ORDER = { LIVE: 0, UPCOMING: 1, PAST: 2 };

const SORTS = [
  ['', '-'],
  ['DATE_DESC', 'Date (newest)'],
  ['DATE_ASC', 'Date (oldest)'],
  ['TITLE', 'Title (A–Z)'],
  ['TEAMS', 'Most teams']
];

// Short numeric id for display (auc-1791250874647 → 74647, auc-101 → 101)
export const shortId = (id) => (String(id).replace(/\D/g, '').slice(-5) || id);

const publicUrl = (id) => `${window.location.origin}${window.location.pathname}#/auctions/${encodeURIComponent(id)}`;

// Auctions in a table: filter by status, search, sort, paginate; actions View / Edit / Live / Public page
export const AuctionsList = ({ mode = 'user', onCreate, onView, onEdit }) => {
  const { auctions, myAuctions, allTeams, getAuctionLock, users, deleteAuction, isSuperAdmin, currentUser } = useAuction();
  const source = mode === 'admin' ? auctions : myAuctions;

  // Every auction shows by default, completed ones included; the filter narrows it down
  const [statuses, setStatuses] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState(null);
  const [toast, setToast] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuFor) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuFor(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor]);

  const teamCount = (id) => allTeams.filter(t => t.auctionId === id).length;
  const ownerName = (email) => users.find(u => u.email === email)?.name || email || '—';
  const q = query.trim().toLowerCase();

  let rows = source.filter(a =>
    (statuses.length === 0 || statuses.includes(a.status)) &&
    (!q || a.title.toLowerCase().includes(q) || (a.sport || '').toLowerCase().includes(q) || shortId(a.id).includes(q) ||
      (mode === 'admin' && ((a.ownerEmail || '').includes(q) || ownerName(a.ownerEmail).toLowerCase().includes(q))))
  );
  // Default order: live first, then upcoming, then completed
  if (!sort) rows = [...rows].sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3));
  if (sort === 'DATE_DESC') rows = [...rows].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  if (sort === 'DATE_ASC') rows = [...rows].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  if (sort === 'TITLE') rows = [...rows].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'TEAMS') rows = [...rows].sort((a, b) => teamCount(b.id) - teamCount(a.id));

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * perPage, current * perPage);

  const toggleStatus = (s) => { setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); setPage(1); };
  const flash = (text) => { setToast(text); setTimeout(() => setToast(''), 2200); };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); flash('Link copied.'); } catch { window.prompt('Copy this link:', text); }
  };
  const canDelete = (a) => isSuperAdmin || (!isManagedAuction(a) && (a.ownerEmail || '').toLowerCase() === currentUser?.email?.toLowerCase());

  const action = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-slate-900">Auctions</h2>
        {onCreate && (
          <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-lime-600 hover:bg-lime-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
            <Plus className="w-4 h-4" /> Create new auction
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Search + filter */}
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={mode === 'admin' ? 'Search title, ID or owner…' : 'Search title or ID…'} aria-label="Search auctions" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(v => !v)} aria-expanded={showFilter} aria-label="Filter" className="relative rounded-lg p-2 text-lime-700 hover:bg-lime-50">
              <Filter className="w-5 h-5" />
              {statuses.length > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-lime-100 px-1.5 text-[10px] font-black text-lime-800">1</span>}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">Status</div>
                {Object.entries(STATUS).map(([id, s]) => (
                  <label key={id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={statuses.includes(id)} onChange={() => toggleStatus(id)} /> {s.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filters */}
        {statuses.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-slate-700">Active filters</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                Status: {statuses.map(s => STATUS[s].label).join(' & ')}
                <button onClick={() => setStatuses([])} aria-label="Remove status filter" className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
              </span>
            </div>
            <button onClick={() => { setStatuses([]); setQuery(''); }} aria-label="Clear all filters" className="text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm">
          <span className="font-semibold text-slate-700">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm">
            {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>

        {/* Rows */}
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sr-only"><tr><th>ID</th><th>Title</th><th>Date</th><th>Status</th><th>Teams</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(a => {
                const st = STATUS[a.status] || STATUS.UPCOMING;
                const lock = getAuctionLock(a.id);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-2 font-mono text-slate-500 w-20">{shortId(a.id)}</td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-500">
                        {a.sport}{mode === 'admin' && <> · {ownerName(a.ownerEmail)}</>} · {lock.plan.name}
                      </div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-slate-700">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" />{Number.isNaN(new Date(a.startDate).getTime()) ? 'Date TBA' : new Date(a.startDate).toISOString().slice(0, 10)}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`} title={st.label}>
                        <st.icon className="w-3.5 h-3.5" /> {st.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-semibold text-slate-700" title="Teams / plan limit">
                      {teamCount(a.id)}<span className="text-slate-400">/{lock.teamLimit}</span>
                      {lock.locked && <Lock className="inline w-3.5 h-3.5 ml-1 text-amber-600" aria-label="Locked" />}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <button onClick={() => onView(a.id)} className={`${action} text-slate-700 hover:bg-slate-100`}><Eye className="w-4 h-4" /> View</button>
                        <button onClick={() => onEdit(a.id)} className={`${action} text-lime-700 hover:bg-lime-50`}><Pencil className="w-4 h-4" /> Edit</button>
                        <button
                          onClick={() => window.open(screenUrl('live-screen', a.id), `fp-live-${a.id}`)}
                          disabled={lock.locked}
                          title={lock.locked ? 'Locked: contact Force Pulse' : 'Open the live auction screen'}
                          className={`${action} text-emerald-700 hover:bg-emerald-50 disabled:text-slate-300 disabled:hover:bg-transparent`}
                        >
                          <Radio className="w-4 h-4" /> Live
                        </button>
                        <button onClick={() => window.open(publicUrl(a.id), '_blank')} className={`${action} text-slate-700 hover:bg-slate-100`}><Users className="w-4 h-4" /> Public Page</button>
                        <div className="relative" ref={menuFor === a.id ? menuRef : null}>
                          <button onClick={() => setMenuFor(menuFor === a.id ? null : a.id)} aria-label={`More actions for ${a.title}`} aria-expanded={menuFor === a.id} className="rounded-lg p-1.5 text-lime-700 hover:bg-lime-50">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {menuFor === a.id && (
                            <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-sm">
                              <button disabled={lock.locked} onClick={() => { window.open(screenUrl('host', a.id), `fp-host-${a.id}`); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-300"><Monitor className="w-4 h-4" /> Host screen</button>
                              <button disabled={lock.locked} onClick={() => { window.open(screenUrl('overlay', a.id), `fp-overlay-${a.id}`); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-300"><Youtube className="w-4 h-4" /> YouTube overlay</button>
                              <button onClick={() => { copy(publicUrl(a.id)); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"><Link2 className="w-4 h-4" /> Copy public link</button>
                              {canDelete(a) && (
                                <button
                                  onClick={() => { setMenuFor(null); if (window.confirm(`Delete "${a.title}" with all its teams and players? This cannot be undone.`)) deleteAuction(a.id); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              {source.length === 0 ? 'No auctions yet.' : 'No auctions match these filters.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-700">
            {rows.length === 0 ? 'Showing 0 results' : rows.length === 1 ? 'Showing 1 result' : `Showing ${(current - 1) * perPage + 1} to ${Math.min(current * perPage, rows.length)} of ${rows.length} results`}
          </span>
          <span className="flex items-center gap-2">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} aria-label="Per page" className="rounded-lg border border-slate-200 bg-white px-2 py-1">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-slate-700">per page</span>
          </span>
          <span className="flex items-center gap-1">
            <button onClick={() => setPage(current - 1)} disabled={current <= 1} aria-label="Previous page" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-slate-600">{current} / {pages}</span>
            <button onClick={() => setPage(current + 1)} disabled={current >= pages} aria-label="Next page" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </span>
        </div>
      </div>
      {toast && <p role="status" className="text-sm font-bold text-lime-700">{toast}</p>}
    </div>
  );
};
