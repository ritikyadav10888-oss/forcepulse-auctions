import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { PLANS, getPlan } from '../../config/forcePulse';
import { AuctionForm } from './AuctionForm';
import { AuctionsList } from './AuctionsList';
import { StatusBadge } from '../Public/BrowseAuctions';
import { AuctionWorkspace } from './AuctionWorkspace';
import { Inbox, Gavel, Users, Plus, CheckCircle2, XCircle, Lock, UserPlus, Settings2, Search, Trash2 } from 'lucide-react';

const SECTIONS = [
  ['REQUESTS', 'Requests', Inbox],
  ['AUCTIONS', 'Auctions', Gavel],
  ['USERS', 'Users', Users]
];

const CreateUserModal = ({ onClose, onCreated }) => {
  const { createUserAccount } = useAuction();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm';

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    const res = await createUserAccount(form);
    if (!res.success) return setError(res.error);
    onCreated(form.email.trim().toLowerCase());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Create user account</h3>
          <p className="text-sm text-slate-500">Share the email and password with the organiser so they can sign in.</p>
        </div>
        <label className="block text-xs font-bold uppercase text-slate-500">Name<input required value={form.name} onChange={set('name')} className={input} /></label>
        <label className="block text-xs font-bold uppercase text-slate-500">Email<input required type="email" value={form.email} onChange={set('email')} className={input} /></label>
        <label className="block text-xs font-bold uppercase text-slate-500">Temporary password<input required type="text" autoComplete="off" value={form.password} onChange={set('password')} className={input} /></label>
        <label className="block text-xs font-bold uppercase text-slate-500">Organisation / league<input value={form.orgName} onChange={set('orgName')} className={input} /></label>
        {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          <button type="submit" className="rounded-xl bg-lime-500 hover:bg-lime-600 px-4 py-2.5 text-sm font-black text-slate-950">Create user</button>
        </div>
      </form>
    </div>
  );
};

// Force Pulse staff dashboard: requests, every auction (assign / plan / set up) and user accounts
export const AdminPanel = () => {
  const {
    unlockRequests, resolveUnlockRequest, auctions, users, getAuctionLock, setAuctionPlan, assignAuction,
    setActiveAuctionId, activeAuctionId, allPlayers, deleteAuction
  } = useAuction();
  const pending = unlockRequests.filter(r => r.status === 'PENDING');
  const [section, setSection] = useState(pending.length ? 'REQUESTS' : 'AUCTIONS');
  const [setupId, setSetupId] = useState(null);
  const [setupTab, setSetupTab] = useState('TEAMS');
  const [grantPlan, setGrantPlan] = useState({});
  // Full-page auction form: { mode: 'create', owner } or { mode: 'edit', id }
  const [formView, setFormView] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [notice, setNotice] = useState('');

  const openSetup = (id, tab = 'TEAMS') => {
    setActiveAuctionId(id);
    setSetupTab(tab);
    setSetupId(id);
    window.scrollTo(0, 0);
  };

  const openCreate = (owner = '') => { setFormView({ mode: 'create', owner }); window.scrollTo(0, 0); };
  const openEdit = (id) => { setActiveAuctionId(id); setFormView({ mode: 'edit', id }); window.scrollTo(0, 0); };

  if (formView?.mode === 'create') {
    return (
      <AuctionForm
        mode="create"
        defaultOwnerEmail={formView.owner}
        onBack={() => setFormView(null)}
        onSaved={(id) => { setFormView(null); openSetup(id, 'TEAMS'); }}
      />
    );
  }
  if (formView?.mode === 'edit' && auctions.some(a => a.id === formView.id)) {
    if (activeAuctionId !== formView.id) return null;
    return <AuctionForm key={formView.id} mode="edit" onBack={() => setFormView(null)} />;
  }

  if (setupId && auctions.some(a => a.id === setupId)) {
    if (activeAuctionId !== setupId) return null;
    return <AuctionWorkspace key={setupId} onBack={() => setSetupId(null)} backLabel="Force Pulse admin" initialTab={setupTab} />;
  }

  const userName = (email) => users.find(u => u.email === email)?.name || email || '—';

  const approve = (r) => {
    const id = resolveUnlockRequest(r.id, true, grantPlan[r.id] || r.planId);
    if (id) openSetup(id, r.auctionId ? 'TEAMS' : 'SETTINGS');
  };

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-lime-400">Force Pulse admin</span>
          <h1 className="font-bebas text-4xl tracking-wide">Control room</h1>
          <p className="text-sm text-slate-400">Create users, assign auctions, and set up teams, players and rules for bigger auctions.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Pending requests', pending.length], ['Auctions', auctions.length], ['Users', users.length]].map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
              <div className="text-2xl font-black text-lime-400">{n}</div>
              <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2 overflow-x-auto">
          {SECTIONS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 ${section === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Icon className="w-3.5 h-3.5 text-lime-500" /> {label}
              {id === 'REQUESTS' && pending.length > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] text-white">{pending.length}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateUser(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <UserPlus className="w-4 h-4" /> New user
          </button>
          <button onClick={() => openCreate('')} className="inline-flex items-center gap-1.5 rounded-xl bg-lime-500 hover:bg-lime-600 px-3.5 py-2.5 text-xs font-black uppercase text-slate-950">
            <Plus className="w-4 h-4" /> Auction for a user
          </button>
        </div>
      </div>

      {notice && <p role="status" className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-2.5 text-sm font-bold text-lime-800">{notice}</p>}

      {/* Requests */}
      {section === 'REQUESTS' && (
        <section className="space-y-3">
          {pending.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No pending requests.</p>}
          {pending.map(r => {
            const lock = r.auctionId ? getAuctionLock(r.auctionId) : null;
            const planId = grantPlan[r.id] || r.planId;
            return (
              <div key={r.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="space-y-1 text-sm">
                  <p className="font-extrabold text-slate-900">
                    {r.auctionId ? 'More teams for ' : 'New auction: '}{r.auctionTitle}
                  </p>
                  <p className="text-slate-600">
                    {r.ownerName} · <a className="underline" href={`mailto:${r.ownerEmail}`}>{r.ownerEmail}</a>
                    {r.phone && <> · <a className="underline" href={`tel:${r.phone}`}>{r.phone}</a></>}
                  </p>
                  <p className="text-slate-600">
                    Wants {r.teamsWanted || r.teamCount} teams{lock && <> (has {lock.teamCount} on {lock.plan.name})</>} · asked for <strong>{getPlan(r.planId).name}</strong>
                    {r.startDate && <> · auction {new Date(r.startDate).toLocaleDateString()}</>} · sent {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.message && <p className="italic text-slate-500">“{r.message}”</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select value={planId} onChange={(e) => setGrantPlan({ ...grantPlan, [r.id]: e.target.value })} aria-label="Plan to grant" className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-bold">
                    {PLANS.filter(p => p.price > 0).map(p => <option key={p.id} value={p.id}>{p.name} ({p.teamLimit} teams)</option>)}
                  </select>
                  <button onClick={() => approve(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
                    <CheckCircle2 className="w-4 h-4" /> Approve & set up
                  </button>
                  <button onClick={() => resolveUnlockRequest(r.id, false)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Auctions */}
      {section === 'AUCTIONS' && (
        <AuctionsList mode="admin" onCreate={() => openCreate('')} onView={(id) => openSetup(id)} onEdit={openEdit} />
      )}

      {/* Users */}
      {section === 'USERS' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr><th className="py-2">User</th><th className="py-2">Organisation</th><th className="py-2">Auctions</th><th className="py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const owned = auctions.filter(a => (a.ownerEmail || '').toLowerCase() === u.email.toLowerCase());
                return (
                  <tr key={u.email}>
                    <td className="py-3 pr-3"><div className="font-bold text-slate-900">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                    <td className="py-3 pr-3 text-slate-600">{u.orgName || '—'}</td>
                    <td className="py-3 pr-3 text-slate-600">
                      {owned.length === 0 ? '—' : owned.map(a => (
                        <button key={a.id} onClick={() => openSetup(a.id)} className="mr-1.5 mb-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-xs font-bold">{a.title}</button>
                      ))}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => openCreate(u.email)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <Plus className="w-3.5 h-3.5" /> Auction for {u.name.split(' ')[0]}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {showCreateUser && <CreateUserModal onClose={() => setShowCreateUser(false)} onCreated={(email) => { setSection('USERS'); flash(`Account created for ${email}.`); }} />}
    </div>
  );
};
