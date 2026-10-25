import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { PlayerPhoto } from '../PlayerPhoto';
import { formatMoney } from '../../services/money';

const STATUS_TEXT = { UPCOMING: 'Yet to auction', CURRENT: 'On the floor', SOLD: 'Sold', UNSOLD: 'Unsold' };
const STATUS_TONE = { UPCOMING: 'bg-slate-100 text-slate-600', CURRENT: 'bg-red-100 text-red-700', SOLD: 'bg-lime-100 text-lime-800', UNSOLD: 'bg-red-50 text-red-600' };

// Overview card: every player by name with a search box; a click opens that player's profile
export const PlayerPool = ({ players, teams }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const term = q.trim().toLowerCase();
  const list = [...players]
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }))
    .filter(p => !term || [p.name, p.role, p.jerseyName, String(p.setNo || '')].some(v => (v || '').toLowerCase().includes(term)));

  return (
    <div className="flex flex-col rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
      <h3 className="font-extrabold text-slate-900">Player pool ({players.length})</h3>
      <label className="relative mt-4 block">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search player by name, role or number…"
          aria-label="Search players"
          className="w-full rounded-lg bg-slate-50 py-2.5 pl-9 pr-3 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-500"
        />
      </label>
      <p className="mt-2 text-xs font-semibold text-slate-500">{term ? `${list.length} of ${players.length} players` : 'Tap a player to see the profile'}</p>
      <ul className="mt-2 max-h-[30rem] divide-y divide-slate-100 overflow-y-auto pr-1">
        {list.map(p => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
              <span className="w-7 shrink-0 text-right text-xs font-bold text-slate-400">{p.setNo}</span>
              <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-full bg-slate-200 object-cover object-top" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-900">{p.name}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{p.role || p.category}</span>
              </span>
              {p.status !== 'UPCOMING' && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${STATUS_TONE[p.status] || ''}`}>{STATUS_TEXT[p.status] || p.status}</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No player matches “{q}”.</li>}
      </ul>
      {open && <PlayerProfile player={players.find(p => p.id === open.id) || open} teams={teams} onClose={() => setOpen(null)} />}
    </div>
  );
};

const PlayerProfile = ({ player: p, teams, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const team = teams.find(t => t.id === p.soldToTeamId);
  const facts = [
    ['Role', p.role || p.category],
    ['Age', p.age],
    ['Jersey', [p.jerseyName, p.jerseyNumber && `#${p.jerseyNumber}`].filter(Boolean).join(' ')],
    ['Set no.', p.setNo],
    ['Base price', formatMoney(p.basePrice)],
    ['Status', STATUS_TEXT[p.status] || p.status],
    p.status === 'SOLD' && ['Sold to', team?.name],
    p.status === 'SOLD' && ['Sold for', formatMoney(p.soldPrice)]
  ].filter(f => f && f[1] !== undefined && f[1] !== null && String(f[1]).trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${p.name} profile`}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        <div className="relative h-80 bg-slate-800"><PlayerPhoto src={p.image} alt={p.name} /></div>
        <div className="space-y-4 p-6">
          <div>
            <h2 className="font-bebas text-5xl leading-none">{p.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">{p.role || p.category}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</dt>
                <dd className={`truncate text-base font-extrabold ${k === 'Sold for' || k === 'Base price' ? 'text-lime-400' : ''}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};
