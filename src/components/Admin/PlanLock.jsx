import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { PLANS, planForTeams, FORCE_PULSE_CONTACT } from '../../config/forcePulse';
import { Lock, X, Mail, Phone, MessageCircle, CheckCircle2, Clock, Unlock } from 'lucide-react';

// Ask Force Pulse for more teams. newAuction: request a brand-new auction that Force Pulse sets up;
// otherwise it upgrades the auction that is open.
export const ContactForcePulseModal = ({ onClose, newAuction = false }) => {
  const { activeAuction, activeLock, requestUnlock, unlockRequests, currentUser } = useAuction();
  const pending = newAuction ? null : unlockRequests.find(r => r.auctionId === activeAuction?.id && r.status === 'PENDING');
  const currentTeams = newAuction ? 0 : activeLock.teamCount;
  const [teamsWanted, setTeamsWanted] = useState(pending?.teamsWanted || Math.max(currentTeams, PLANS[0].teamLimit) + 2);
  const [planId, setPlanId] = useState(pending?.planId || planForTeams(Math.max(currentTeams, PLANS[0].teamLimit + 1)).id);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [phone, setPhone] = useState(pending?.phone || '');
  const [message, setMessage] = useState(pending?.message || '');
  const [sent, setSent] = useState(false);

  const paidPlans = PLANS.filter(p => p.price > 0);
  const subject = newAuction ? `New auction: ${title || 'request'}` : `More teams for: ${activeAuction?.title}`;
  const contactLinks = [
    FORCE_PULSE_CONTACT.email && { icon: Mail, label: FORCE_PULSE_CONTACT.email, href: `mailto:${FORCE_PULSE_CONTACT.email}?subject=${encodeURIComponent(subject)}` },
    FORCE_PULSE_CONTACT.phone && { icon: Phone, label: FORCE_PULSE_CONTACT.phone, href: `tel:${FORCE_PULSE_CONTACT.phone}` },
    FORCE_PULSE_CONTACT.whatsapp && { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/${FORCE_PULSE_CONTACT.whatsapp}` }
  ].filter(Boolean);

  const updateTeams = (value) => {
    setTeamsWanted(value);
    const n = Number(value);
    if (n > 0) setPlanId(planForTeams(Math.max(n, PLANS[0].teamLimit + 1)).id);
  };

  const submit = (e) => {
    e.preventDefault();
    const ok = requestUnlock({
      auctionId: newAuction ? null : activeAuction?.id,
      planId, phone, message, title, startDate,
      teamsWanted: Number(teamsWanted)
    });
    if (ok) setSent(true);
  };

  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{newAuction ? 'Request a bigger auction' : 'Contact Force Pulse'}</h3>
            <p className="text-sm text-slate-500">
              {newAuction
                ? `Free auctions have up to ${PLANS[0].teamLimit} teams. For more, Force Pulse sets up your teams, players and rules for you.`
                : `${activeAuction?.title} has ${activeLock.teamCount} teams. The ${activeLock.plan.name} plan covers ${activeLock.teamLimit}. Force Pulse will upgrade it and set up the extra teams.`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-lime-50 border border-lime-200 p-5 space-y-2">
            <p className="flex items-center gap-2 font-extrabold text-lime-800"><CheckCircle2 className="w-5 h-5" /> Request sent</p>
            <p className="text-sm text-lime-900">
              The Force Pulse team will call you to confirm the plan, then set up the auction. It will appear in your dashboard.
            </p>
            <button onClick={onClose} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {newAuction && (
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Auction / tournament name</span>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. City Corporate Cup 2026" className={input} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Auction date</span>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
                </label>
              </div>
            )}

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">How many teams?</span>
              <input type="number" min={PLANS[0].teamLimit + 1} max={PLANS[PLANS.length - 1].teamLimit} required value={teamsWanted} onChange={(e) => updateTeams(e.target.value)} className={input} />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase text-slate-500 mb-2">Plan</legend>
              {paidPlans.map(p => {
                const tooSmall = p.teamLimit < Math.max(currentTeams, Number(teamsWanted) || 0);
                return (
                  <label key={p.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer ${planId === p.id ? 'border-lime-500 bg-lime-50' : 'border-slate-200'} ${tooSmall ? 'opacity-50' : ''}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="plan" value={p.id} checked={planId === p.id} disabled={tooSmall} onChange={() => setPlanId(p.id)} />
                      <span className="font-bold text-sm text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-500">up to {p.teamLimit} teams</span>
                    </span>
                    <strong className="text-sm">₹{p.price.toLocaleString('en-IN')}</strong>
                  </label>
                );
              })}
            </fieldset>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Your phone number</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="So we can call you back" className={input} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Message (optional)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Sport, number of players, anything we should know" className={input} />
            </label>
            <p className="text-xs text-slate-500">Request from <strong>{currentUser?.email}</strong></p>

            <button type="submit" className="w-full rounded-xl bg-lime-500 hover:bg-lime-600 py-3 text-sm font-black uppercase tracking-wider text-slate-950">
              {pending ? 'Update request' : 'Send request to Force Pulse'}
            </button>
          </form>
        )}

        {contactLinks.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500">Or reach us directly</p>
            <div className="flex flex-wrap gap-2">
              {contactLinks.map(({ icon: Icon, label, href }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <Icon className="w-4 h-4 text-lime-600" /> {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Plan status strip shown on admin pages: free/paid usage, or a lock with the contact button
export const PlanBanner = () => {
  const { activeAuction, activeLock, unlockRequests, canSetup, isSuperAdmin } = useAuction();
  const [showContact, setShowContact] = useState(false);
  if (!activeAuction) return null;
  const pending = unlockRequests.find(r => r.auctionId === activeAuction.id && r.status === 'PENDING');

  return (
    <>
      {activeLock.locked ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-900">Auction locked: {activeLock.teamCount} teams on the {activeLock.plan.name} plan (max {activeLock.teamLimit})</p>
              <p className="text-sm text-amber-800">
                Bidding, the controller and screens stay locked until Force Pulse upgrades this auction's plan.
              </p>
              {pending && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Clock className="w-3.5 h-3.5" /> Unlock request sent {new Date(pending.createdAt).toLocaleString()}. Waiting for Force Pulse.
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setShowContact(true)} className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
            <Unlock className="w-4 h-4 text-lime-400" /> {pending ? 'View request' : 'Contact Force Pulse'}
          </button>
        </div>
      ) : canSetup && !isSuperAdmin && activeLock.teamCount >= activeLock.teamLimit ? (
        // Organiser at the team limit of their plan: offer the way to more teams
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm">
          <span className="text-lime-900">
            All <strong>{activeLock.teamLimit}</strong> teams of the {activeLock.plan.name} plan are used.
          </span>
          <button onClick={() => setShowContact(true)} className="text-xs font-bold text-lime-800 hover:underline">
            Need more teams? Ask Force Pulse →
          </button>
        </div>
      ) : null}
      {showContact && <ContactForcePulseModal onClose={() => setShowContact(false)} />}
    </>
  );
};
