import React, { useEffect, useState } from 'react';
import { useSessionState, clearSessionState } from '../../hooks/useSessionState';
import { useAuction } from '../../context/AuctionContext';
import { PLANS, getPlan } from '../../config/forcePulse';
import { AuctionForm } from './AuctionForm';
import { AuctionsList } from './AuctionsList';
import { StatusBadge } from '../Public/BrowseAuctions';
import { AuctionWorkspace } from './AuctionWorkspace';
import { Inbox, Gavel, Users, Plus, CheckCircle2, XCircle, Lock, UserPlus, Settings2, Search, Trash2 } from 'lucide-react';
import { Button, Eyebrow, Stat, Stripes, Tabs, EmptyState } from '../ui';

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
  // Section, open auction and edit page survive a refresh of this tab
  const [section, setSection] = useSessionState('fp:admin:section', pending.length ? 'REQUESTS' : 'AUCTIONS');
  const [setupId, setSetupId] = useSessionState('fp:admin:setup', null);
  const [setupTab, setSetupTab] = useSessionState('fp:admin:setupTab', 'TEAMS');
  const [grantPlan, setGrantPlan] = useState({});
  // Full-page auction form: { mode: 'create', owner } or { mode: 'edit', id }
  const [formView, setFormView] = useSessionState('fp:admin:form', null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [notice, setNotice] = useState('');

  const openSetup = (id, tab = 'TEAMS') => {
    clearSessionState(`fp:ws:tab:${id}`); // opening from the list starts on the tab asked for
    setActiveAuctionId(id);
    setSetupTab(tab);
    setSetupId(id);
    window.scrollTo(0, 0);
  };

  // The open auction (or the one being edited) is made the active one again if browsing changed it
  const wanted = formView?.mode === 'edit' ? formView.id : setupId;
  useEffect(() => {
    if (wanted && wanted !== activeAuctionId && auctions.some(a => a.id === wanted)) setActiveAuctionId(wanted);
  }, [wanted, activeAuctionId, auctions.length]);

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
    if (activeAuctionId !== formView.id) return <p className="py-16 text-center text-sm font-semibold text-slate-500">Opening auction…</p>;
    return <AuctionForm key={formView.id} mode="edit" onBack={() => setFormView(null)} />;
  }

  if (setupId && auctions.some(a => a.id === setupId)) {
    if (activeAuctionId !== setupId) return <p className="py-16 text-center text-sm font-semibold text-slate-500">Opening auction…</p>;
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
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
        <Stripes />
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-lime-500/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <Eyebrow dark>Force Pulse admin</Eyebrow>
            <h1 className="font-bebas text-5xl leading-none">Control room</h1>
            <p className="max-w-lg text-sm text-slate-400">Create users, assign auctions, and set up teams, players and rules for bigger auctions.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:w-[26rem]">
            <Stat dark label="Requests" value={pending.length} tone={pending.length ? 'gold' : 'default'} />
            <Stat dark label="Auctions" value={auctions.length} />
            <Stat dark label="Users" value={users.length} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={section}
          onChange={setSection}
          items={SECTIONS.map(([id, label, Icon]) => ({ id, label, icon: Icon, count: id === 'REQUESTS' ? pending.length : id === 'AUCTIONS' ? auctions.length : users.length }))}
        />
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setShowCreateUser(true)}><UserPlus className="w-4 h-4" /> New user</Button>
          <Button onClick={() => openCreate('')}><Plus className="w-4 h-4" /> Auction for a user</Button>
        </div>
      </div>

      {notice && <p role="status" className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-2.5 text-sm font-bold text-lime-800">{notice}</p>}

      {/* Requests */}
      {section === 'REQUESTS' && (
        <section className="space-y-3">
          {pending.length === 0 && <EmptyState icon={Inbox} title="All caught up" text="No pending requests from organisers." />}
          {pending.map(r => {
            const lock = r.auctionId ? getAuctionLock(r.auctionId) : null;
            const planId = grantPlan[r.id] || r.planId;
            return (
              <div key={r.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border-l-4 border-lime-500 bg-white p-5 ring-1 ring-slate-200 shadow-sm">
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
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm overflow-x-auto">
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
