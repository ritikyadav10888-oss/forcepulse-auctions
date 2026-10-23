import React, { useCallback, useEffect, useState } from 'react';
import { useAuction, suggestedBasePrice } from '../../context/AuctionContext';
import { api } from '../../services/serverSync';
import { DEFAULT_PLAYER_PHOTO } from '../../config/placeholders';
import { MoneyInput } from '../MoneyInput';
import { Check, Copy, ExternalLink, Phone, X } from 'lucide-react';
import { formatMoney } from '../../services/money';

export const registrationUrl = (auctionId) => `${window.location.origin}/#/register/${encodeURIComponent(auctionId)}`;

const FILTERS = [['PENDING', 'Waiting'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']];

// Organiser: open the public sign-up link, then approve sign-ups into the player pool
export const RegistrationsManager = () => {
  const { activeAuction, editAuction, addPlayer, canEditPlayers, showNotice } = useAuction();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [basePrice, setBasePrice] = useState(() => suggestedBasePrice(activeAuction));
  const [copied, setCopied] = useState(false);
  const auctionId = activeAuction.id;
  const link = registrationUrl(auctionId);

  const load = useCallback(async () => {
    try {
      const { registrations } = await api(`/api/registrations?auctionId=${encodeURIComponent(auctionId)}`);
      setList(registrations);
    } catch (err) {
      showNotice(err.message);
    } finally {
      setLoading(false);
    }
  }, [auctionId, showNotice]);

  useEffect(() => {
    load();
    const onChange = (e) => { if (e.detail?.auctionId === auctionId) load(); };
    window.addEventListener('fp:registrations', onChange);
    return () => window.removeEventListener('fp:registrations', onChange);
  }, [load, auctionId]);

  const setStatus = async (reg, status) => {
    if (status === 'APPROVED') {
      const price = Number(basePrice);
      if (!(price > 0)) return showNotice('Set a base price above 0 first.');
      const { id: _id, status: _s, createdAt: _c, phone: _p, notes: _n, ...player } = reg;
      const ok = addPlayer({
        ...player,
        image: reg.image || DEFAULT_PLAYER_PHOTO,
        basePrice: price,
        setNo: 1,
        registrationId: reg.id
      });
      if (!ok) return undefined;
    }
    try {
      await api(`/api/registrations/${reg.id}`, { method: 'PATCH', body: { status } });
      setList(prev => prev.map(r => r.id === reg.id ? { ...r, status } : r));
      if (status === 'APPROVED') showNotice(`${reg.name} added to the player pool at ${formatMoney(basePrice)}.`, 'info');
    } catch (err) {
      showNotice(err.message);
    }
    return undefined;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showNotice('Could not copy. Select the link and copy it instead.');
    }
  };

  const shown = list.filter(r => r.status === filter);
  const count = (s) => list.filter(r => r.status === s).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Player registration</h2>
            <p className="text-xs text-slate-500 font-medium">Players sign up through this link; approve them to add them to the auction.</p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800">
            <input
              type="checkbox"
              checked={!!activeAuction.registrationOpen}
              onChange={(e) => editAuction(auctionId, { registrationOpen: e.target.checked })}
              className="h-4 w-4 accent-lime-600"
            />
            Registration open
          </label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Registration link" className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700" />
          <button onClick={copy} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            {copied ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
            <ExternalLink className="w-4 h-4" /> Open form
          </a>
        </div>
        {!activeAuction.registrationOpen && <p className="text-xs font-bold text-amber-700">Registration is closed: the form tells players it isn't accepting sign-ups.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider ${filter === id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
          >
            {label} ({count(id)})
          </button>
        ))}
        {filter === 'PENDING' && canEditPlayers && (
          <label className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            Base price on approval
            <MoneyInput label="Base price on approval" value={basePrice} onChange={setBasePrice} inputClassName="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading sign-ups…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {filter === 'PENDING' ? 'No sign-ups waiting. Share the link above with players.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(r => (
            <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <img src={r.image || DEFAULT_PLAYER_PHOTO} alt="" className="h-16 w-16 rounded-2xl object-cover bg-slate-200" />
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 truncate">{r.name}</div>
                  <div className="text-xs font-bold uppercase text-slate-500">{r.category || '—'}{r.role ? ` · ${r.role}` : ''}</div>
                  <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-xs font-bold text-lime-700"><Phone className="w-3 h-3" />{r.phone}</a>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                {[['Age', r.age], ['Country', `${r.country || ''}${r.isOverseas ? ' (overseas)' : ''}`], ['Batting', r.battingStyle], ['Bowling', r.bowlingStyle], ['Previous team', r.previousTeam],
                  ['Matches', r.stats?.matches], ['Runs', r.stats?.runs], ['Wickets', r.stats?.wickets]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><dt className="inline font-bold text-slate-400">{k}: </dt><dd className="inline font-semibold">{v}</dd></div>
                ))}
              </dl>
              {r.notes && <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">{r.notes}</p>}
              <div className="text-[11px] text-slate-400">Signed up {new Date(r.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
              {r.status === 'PENDING' && canEditPlayers && (
                <div className="flex gap-2">
                  <button onClick={() => setStatus(r, 'APPROVED')} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-lime-500 hover:bg-lime-600 px-3 py-2 text-xs font-black text-slate-950"><Check className="w-4 h-4" /> Approve</button>
                  <button onClick={() => setStatus(r, 'REJECTED')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-700"><X className="w-4 h-4" /> Reject</button>
                </div>
              )}
              {r.status === 'REJECTED' && canEditPlayers && (
                <button onClick={() => setStatus(r, 'PENDING')} className="text-xs font-bold text-slate-500 underline">Move back to waiting</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
