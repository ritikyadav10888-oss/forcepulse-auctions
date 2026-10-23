import React, { useState } from 'react';
import { useSessionState } from '../../hooks/useSessionState';
import { useAuction } from '../../context/AuctionContext';
import { FREE_PLAN, getPlan } from '../../config/forcePulse';
import { ContactForcePulseModal } from '../Admin/PlanLock';
import { AuctionWorkspace } from './AuctionWorkspace';
import { AuctionForm } from './AuctionForm';
import { AuctionsList } from './AuctionsList';
import { Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Eyebrow, Stripes } from '../ui';

// Organiser dashboard: my auctions, create a free one, or ask Force Pulse for a bigger one
export const UserDashboard = () => {
  const { currentUser, myAuctions, setActiveAuctionId, activeAuctionId, unlockRequests } = useAuction();
  // Open auction and edit page survive a refresh of this tab
  const [openId, setOpenId] = useSessionState('fp:dash:open', null);
  // Full-page auction form: 'create', or the id of the auction being edited
  const [formView, setFormView] = useSessionState('fp:dash:form', null);
  const [showRequest, setShowRequest] = useState(false);

  const open = (id) => { setActiveAuctionId(id); setOpenId(id); window.scrollTo(0, 0); };
  const openEdit = (id) => { setActiveAuctionId(id); setFormView(id); window.scrollTo(0, 0); };

  if (formView === 'create') {
    return <AuctionForm mode="create" onBack={() => setFormView(null)} onSaved={(id) => { setFormView(null); open(id); }} />;
  }
  if (formView && myAuctions.some(a => a.id === formView)) {
    if (activeAuctionId !== formView) return null;
    return <AuctionForm key={formView} mode="edit" onBack={() => setFormView(null)} />;
  }

  if (openId && myAuctions.some(a => a.id === openId)) {
    if (activeAuctionId !== openId) return null;
    return <AuctionWorkspace onBack={() => setOpenId(null)} backLabel="My auctions" />;
  }

  const myRequests = unlockRequests.filter(r => r.ownerEmail === currentUser?.email).slice(0, 5);

  return (
    <div className="space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 text-white p-6 sm:p-10">
        <Stripes />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Eyebrow dark>Organiser dashboard</Eyebrow>
            <h1 className="font-bebas text-5xl leading-none">Welcome, {currentUser?.name || currentUser?.email}</h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Create a free auction with up to {FREE_PLAN.teamLimit} teams and set it up yourself. Need more teams? Force Pulse sets up
              the whole auction for you: teams, players and rules.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setFormView('create')}><Plus className="w-4 h-4" /> Create free auction</Button>
            <Button size="lg" variant="ghostDark" onClick={() => setShowRequest(true)}>More than {FREE_PLAN.teamLimit} teams? Ask Force Pulse</Button>
          </div>
        </div>
      </div>

      {myRequests.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm space-y-3">
          <h2 className="font-extrabold text-slate-900">My requests to Force Pulse</h2>
          <ul className="space-y-2 text-sm">
            {myRequests.map(r => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span><strong>{r.auctionTitle}</strong> · {r.teamsWanted || r.teamCount} teams · {getPlan(r.planId).name}</span>
                {r.status === 'PENDING' && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><Clock className="w-3.5 h-3.5" /> Waiting for Force Pulse</span>}
                {r.status === 'APPROVED' && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Approved: set up by Force Pulse</span>}
                {r.status === 'REJECTED' && <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><XCircle className="w-3.5 h-3.5" /> Declined: contact Force Pulse</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AuctionsList mode="user" onCreate={() => setFormView('create')} onView={open} onEdit={openEdit} />

      {showRequest && <ContactForcePulseModal newAuction onClose={() => setShowRequest(false)} />}
    </div>
  );
};
