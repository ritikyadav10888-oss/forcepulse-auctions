import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { PLANS, FREE_PLAN, planForTeams, FORCE_PULSE_CONTACT } from '../../config/forcePulse';
import { uploadImage, IMAGE_SIZES } from '../../services/imageUpload';
import { ArrowLeft, Plus, Trash2, CheckCircle2, ImagePlus, X, LifeBuoy } from 'lucide-react';
import { shortId } from './AuctionsList';
import { formatMoney } from '../../services/money';
import { MoneyInput } from '../MoneyInput';

const SPORTS = ['Cricket', 'Football', 'Kabaddi', 'Volleyball', 'Badminton', 'Tennis', 'Basketball', 'Hockey', 'Other'];

const DEFAULT_SLABS = [
  { maxPrice: 1, step: 0.1 },
  { maxPrice: 5, step: 0.25 },
  { maxPrice: 10, step: 0.5 },
  { maxPrice: 1000, step: 1 }
];

const toLocalInput = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formFrom = (a) => ({
  sport: a?.sport || 'Cricket',
  title: a?.title || '',
  startDate: a ? toLocalInput(a.startDate) : toLocalInput(new Date(Date.now() + 86400000).toISOString()),
  assignedAdmin: a?.assignedAdmin || '',
  teamCount: 2,
  status: a?.status || 'UPCOMING',
  description: a?.description || '',
  tournamentLogo: a?.tournamentLogo || '',
  banner: a?.banner || '',
  // Rules & settings
  randomOrder: (a?.playerOrder || 'SEQUENTIAL') === 'RANDOM',
  purseLimit: a?.purseLimit ?? 100,
  maxSquadSize: a?.maxSquadSize ?? 15,
  minSquadSize: a?.minSquadSize ?? 11,
  maxOverseas: a?.maxOverseas ?? 4,
  maxBidPerPlayer: a?.maxBidPerPlayer || '',
  unsoldPolicy: a?.unsoldPolicy || 'REAUCTION',
  unlimitedPurse: !!a?.unlimitedPurse,
  calcMaxBid: a?.calcMaxBid !== false,
  useFixedReserve: !!a?.useFixedReserve,
  reservePerPlayer: a?.reservePerPlayer ?? 0.2,
  allowSameTeamRebid: !!a?.allowSameTeamRebid,
  bidIncrements: (a?.bidIncrements?.length ? a.bidIncrements : DEFAULT_SLABS).map(s => ({ ...s })),
  // Player info
  playerInfoLabels: Array.from({ length: 6 }, (_, i) => a?.playerInfoLabels?.[i] || ''),
  // Branding
  sponsors: (a?.sponsors || []).map(s => ({ name: s.name || '', logo: s.logo || '' })),
  // Force Pulse only
  ownerEmail: a?.ownerEmail || '',
  plan: a?.plan || 'AUTO',
  publicPageEnabled: a ? a.publicPageEnabled !== false : true
});

const Section = ({ title, text, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5">
      <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
      {text && <p className="text-xs text-slate-500 mt-0.5">{text}</p>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Field = ({ label, required, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold text-slate-600">
      {label}{required && <span className="text-red-500"> *</span>}
      {hint && <span className="ml-2 font-medium text-slate-400">{hint}</span>}
    </span>
    {children}
  </label>
);

const Toggle = ({ checked, onChange, label, hint, disabled }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`mt-0.5 relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-lime-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
    <span>
      <span className="block text-sm font-bold text-slate-800">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </span>
  </div>
);

const LOGO_SIZE = IMAGE_SIZES.tournamentLogo;
const BANNER_SIZE = IMAGE_SIZES.banner;

const ImageField = ({ label, hint, value, onChange, disabled, size }) => {
  const [error, setError] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setError('');
      onChange(await uploadImage(file, size));
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div>
      <span className="text-xs font-bold text-slate-600">{label}{hint && <span className="ml-2 font-medium text-slate-400">{hint}</span>}</span>
      {value ? (
        <div className="relative mt-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <img src={value} alt="" className="h-40 w-full object-contain" />
          {!disabled && (
            <button type="button" onClick={() => onChange('')} aria-label={`Remove ${label}`} className="absolute top-2 left-2 rounded-lg bg-slate-950/70 p-1.5 text-white hover:bg-slate-950">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <label className={`mt-1 flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 ${disabled ? 'opacity-50' : 'cursor-pointer hover:border-lime-500 hover:text-lime-700'}`}>
          <ImagePlus className="w-7 h-7" />
          <span className="text-xs font-bold">Upload image</span>
          <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={pick} aria-label={`Upload ${label}`} />
        </label>
      )}
      {error && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{error}</p>}
    </div>
  );
};

// Create or edit an auction. Editing works on the open (active) auction.
export const AuctionForm = ({ mode = 'create', defaultOwnerEmail = '', onBack, onSaved, embedded = false }) => {
  const {
    activeAuction, createAuction, editAuction, canSetup, canEditPlayers, isSuperAdmin, users, teams, editTeam,
    assignAuction, setAuctionPlan
  } = useAuction();
  const isEdit = mode === 'edit';
  const auction = isEdit ? activeAuction : null;
  const [form, setForm] = useState(() => ({ ...formFrom(auction), ownerEmail: auction?.ownerEmail || defaultOwnerEmail }));
  const [applyPurse, setApplyPurse] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const editable = !isEdit || canSetup;
  // The organiser of a Force Pulse-managed auction still sets its logo and banner
  const brandingOnly = isEdit && !canSetup && canEditPlayers;
  const saveBranding = () => {
    if (!editAuction(auction.id, { tournamentLogo: form.tournamentLogo, banner: form.banner })) return;
    setSaved('Logo and banner saved.');
    setTimeout(() => setSaved(''), 2500);
  };
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setVal = (key) => (v) => setForm(f => ({ ...f, [key]: v }));
  // Logo / banner on an existing auction save as soon as they are uploaded or removed (no need to find Save at the bottom)
  const setImage = (key) => (v) => {
    setVal(key)(v);
    if (!isEdit || !(canSetup || brandingOnly) || !editAuction(auction.id, { [key]: v })) return;
    setSaved(v ? `${key === 'banner' ? 'Banner' : 'Logo'} saved: every screen shows it now.` : `${key === 'banner' ? 'Banner' : 'Logo'} removed.`);
    setTimeout(() => setSaved(''), 3000);
  };
  const teamLimit = isSuperAdmin ? PLANS[PLANS.length - 1].teamLimit : FREE_PLAN.teamLimit;

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const min = Number(form.minSquadSize);
    const max = Number(form.maxSquadSize);
    if (min > max) return setError('Minimum players per team cannot be more than total players per team.');
    const slabs = form.bidIncrements
      .map(s => ({ maxPrice: Number(s.maxPrice), step: Number(s.step) }))
      .filter(s => s.maxPrice > 0 && s.step > 0)
      .sort((a, b) => a.maxPrice - b.maxPrice);
    if (slabs.length === 0) return setError('Add at least one bid increment.');
    const teamCount = Number(form.teamCount);
    if (!isEdit && (teamCount < 2 || teamCount > teamLimit)) {
      return setError(isSuperAdmin
        ? `Total teams must be between 2 and ${teamLimit}.`
        : `Free auctions have 2 teams. For more teams, use "More than 2 teams? Ask Force Pulse" on your dashboard.`);
    }

    const data = {
      sport: form.sport,
      title: form.title.trim(),
      // Blank date is allowed (shown as "Date TBA")
      startDate: form.startDate ? new Date(form.startDate).toISOString() : '',
      assignedAdmin: form.assignedAdmin.trim(),
      status: form.status,
      description: form.description.trim(),
      tournamentLogo: form.tournamentLogo,
      banner: form.banner,
      playerOrder: form.randomOrder ? 'RANDOM' : 'SEQUENTIAL',
      purseLimit: Number(form.purseLimit),
      maxSquadSize: max,
      minSquadSize: min,
      maxOverseas: Number(form.maxOverseas),
      maxBidPerPlayer: Number(form.maxBidPerPlayer) || 0,
      unsoldPolicy: form.unsoldPolicy,
      unlimitedPurse: form.unlimitedPurse,
      calcMaxBid: form.calcMaxBid,
      useFixedReserve: form.useFixedReserve,
      reservePerPlayer: Number(form.reservePerPlayer),
      allowSameTeamRebid: form.allowSameTeamRebid,
      bidIncrements: slabs,
      playerInfoLabels: form.playerInfoLabels.map(l => l.trim()),
      sponsors: form.sponsors.map(s => ({ name: s.name.trim(), logo: s.logo.trim() })).filter(s => s.name || s.logo)
    };

    if (!isEdit) {
      const plan = form.plan === 'AUTO' ? planForTeams(teamCount).id : form.plan;
      const id = createAuction({ ...data, teamCount, ...(isSuperAdmin ? { ownerEmail: form.ownerEmail, plan, publicPageEnabled: form.publicPageEnabled } : {}) });
      if (id) onSaved?.(id);
      return;
    }

    if (!editAuction(auction.id, isSuperAdmin ? { ...data, publicPageEnabled: form.publicPageEnabled } : data)) return;
    // Teams still on the old default purse follow the new one; the checkbox also moves teams with their own purse
    const oldPurse = Number(auction.purseLimit);
    const newPurse = Number(form.purseLimit);
    teams
      .filter(t => Number(t.initialPurse) !== newPurse && (applyPurse || Number(t.initialPurse) === oldPurse))
      .forEach(t => editTeam(t.id, { initialPurse: newPurse }));
    if (isSuperAdmin) {
      if (form.ownerEmail && form.ownerEmail !== auction.ownerEmail) assignAuction(auction.id, form.ownerEmail);
      if (form.plan !== 'AUTO' && form.plan !== auction.plan) setAuctionPlan(auction.id, form.plan);
    }
    setSaved('Auction saved.');
    setTimeout(() => setSaved(''), 2500);
    onSaved?.(auction.id);
  };

  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-slate-50 disabled:text-slate-500';
  const money = input.replace('mt-1 w-full ', '');
  const setSlab = (i, key) => (v) => setForm(f => ({ ...f, bidIncrements: f.bidIncrements.map((s, j) => j === i ? { ...s, [key]: v } : s) }));

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      {!embedded && (
        <div className="space-y-3">
          {onBack && (
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> Auctions
            </button>
          )}
          <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? `Edit · ${auction?.title}` : 'Create new auction'}</h1>
        </div>
      )}
      {isEdit && !canSetup && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          This auction is set up by Force Pulse. Contact Force Pulse to change these settings.
        </p>
      )}

      {brandingOnly && (
        <Section title="Logo & banner" text="Your tournament's logo and banner, shown on the public page and the screens.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageField label="Logo" hint={LOGO_SIZE.label} value={form.tournamentLogo} onChange={setImage('tournamentLogo')} size={LOGO_SIZE} />
            <ImageField label="Banner" hint={BANNER_SIZE.label} value={form.banner} onChange={setImage('banner')} size={BANNER_SIZE} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={saveBranding} className="rounded-xl bg-lime-500 hover:bg-lime-600 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-slate-950">Save logo & banner</button>
            {saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm font-bold text-lime-700"><CheckCircle2 className="w-4 h-4" /> {saved}</span>}
          </div>
        </Section>
      )}

      <fieldset disabled={!editable} className="space-y-6">
        {isSuperAdmin && (
          <Section title="Owner & plan" text="Force Pulse only: who this auction belongs to and how many teams it may have.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Assigned to (owner)" required>
                <input type="email" required list="fp-owner-list" value={form.ownerEmail} onChange={set('ownerEmail')} placeholder="organiser@example.com" className={input} />
                <datalist id="fp-owner-list">{users.map(u => <option key={u.email} value={u.email}>{u.name}</option>)}</datalist>
              </Field>
              <Field label="Plan">
                <select value={form.plan} onChange={set('plan')} className={input}>
                  <option value="AUTO">Automatic (fits the number of teams)</option>
                  {PLANS.map(p => <option key={p.id} value={p.id}>{p.name} · up to {p.teamLimit} teams</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Toggle checked={form.publicPageEnabled} onChange={setVal('publicPageEnabled')} label="Verified: public page enabled" hint="Off = the auction is hidden from Browse Auctions and its public link shows 'not available'." />
              </div>
            </div>
          </Section>
        )}

        <Section title="Basic Info">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Select Sport" required>
              <select value={form.sport} onChange={set('sport')} className={input}>{SPORTS.map(s => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Title" required>
              <input required value={form.title} onChange={set('title')} placeholder="e.g. City Premier League 2026" className={input} />
            </Field>
            <Field label="Date" required>
              <input type="datetime-local" required value={form.startDate} onChange={set('startDate')} className={input} />
            </Field>
            <Field label="Organizer Name">
              <input value={form.assignedAdmin} onChange={set('assignedAdmin')} className={input} />
            </Field>
            {isEdit ? (
              <Field label="Total teams" hint="add or remove in the Teams tab">
                <input value={teams.length} disabled className={input} />
              </Field>
            ) : (
              <Field label="Total teams" required hint={isSuperAdmin ? `2 – ${teamLimit}` : 'Free plan: 2 teams'}>
                <input type="number" min="2" max={isSuperAdmin ? teamLimit : undefined} required aria-label="Total teams" value={form.teamCount} onChange={set('teamCount')} className={input} />
              </Field>
            )}
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={input}>
                <option value="UPCOMING">Yet to start</option>
                <option value="LIVE">Started (live)</option>
                <option value="PAST">Completed</option>
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2 lg:col-span-3">
              <input value={form.description} onChange={set('description')} placeholder="Shown on the public auction page" className={input} />
            </Field>
            {!brandingOnly && <>
              <ImageField label="Logo" hint={LOGO_SIZE.label} value={form.tournamentLogo} onChange={setImage('tournamentLogo')} disabled={!editable} size={LOGO_SIZE} />
              <ImageField label="Banner" hint={BANNER_SIZE.label} value={form.banner} onChange={setImage('banner')} disabled={!editable} size={BANNER_SIZE} />
              {isEdit && saved && <span role="status" className="self-end inline-flex items-center gap-1.5 text-sm font-bold text-lime-700"><CheckCircle2 className="w-4 h-4" /> {saved}</span>}
            </>}
          </div>
        </Section>

        <Section title="Rules & Settings">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
            <Toggle checked={form.randomOrder} onChange={setVal('randomOrder')} label="Auction players in random order" hint="Draw players at random instead of by set" />
            <Field label="Default team purse" required>
              <MoneyInput label="Default team purse" required value={form.purseLimit} onChange={setVal('purseLimit')} className="mt-1" inputClassName={money} />
            </Field>
            <Field label="Total players per team" required hint="maximum squad">
              <input type="number" min="1" required value={form.maxSquadSize} onChange={set('maxSquadSize')} className={input} />
            </Field>
            <Field label="What to do with unsold players?" required>
              <select value={form.unsoldPolicy} onChange={set('unsoldPolicy')} className={input}>
                <option value="REAUCTION">Re-auction (back in the queue)</option>
                <option value="REMOVE">Remove (not auctioned again)</option>
              </select>
            </Field>
            <Field label="Minimum players per team" required>
              <input type="number" min="0" required value={form.minSquadSize} onChange={set('minSquadSize')} className={input} />
            </Field>
            <Field label="Max overseas players per team">
              <input type="number" min="0" value={form.maxOverseas} onChange={set('maxOverseas')} className={input} />
            </Field>
            <Field label="Max bid per player" hint="empty = no limit">
              <MoneyInput label="Max bid per player" value={form.maxBidPerPlayer} onChange={setVal('maxBidPerPlayer')} className="mt-1" inputClassName={money} />
            </Field>
            <Toggle checked={form.unlimitedPurse} onChange={setVal('unlimitedPurse')} label="Unlimited team purse" hint="Teams can bid without a purse limit" />
            <Toggle checked={form.calcMaxBid} onChange={setVal('calcMaxBid')} disabled={form.unlimitedPurse} label="Calculate max bid" hint="Keep money aside to complete the minimum squad" />
            <Toggle checked={form.allowSameTeamRebid} onChange={setVal('allowSameTeamRebid')} label="Same team can raise its own bid" />
            <div className="space-y-2">
              <Toggle checked={form.useFixedReserve} onChange={setVal('useFixedReserve')} disabled={form.unlimitedPurse || !form.calcMaxBid} label="Reserve a fixed amount per player" hint="Instead of the lowest base price" />
              {form.useFixedReserve && !form.unlimitedPurse && form.calcMaxBid && (
                <Field label="Amount per remaining player">
                  <MoneyInput label="Amount per remaining player" value={form.reservePerPlayer} onChange={setVal('reservePerPlayer')} className="mt-1" inputClassName={money} />
                </Field>
              )}
            </div>
          </div>
          {isEdit && teams.length > 0 && (
            <label className="mt-5 inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={applyPurse} onChange={(e) => setApplyPurse(e.target.checked)} />
              Also set teams with their own purse to {formatMoney(form.purseLimit)} (teams on the default purse always follow it)
            </label>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5 space-y-2">
            <h3 className="text-sm font-extrabold text-slate-900">Bid increments</h3>
            <p className="text-xs text-slate-500">While the current bid is below "up to", each raise adds "increment".</p>
            <div className="grid gap-2 max-w-md">
              {form.bidIncrements.map((slab, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label={i === 0 ? 'Up to' : ''}>
                    <MoneyInput label="Up to" value={slab.maxPrice} onChange={setSlab(i, 'maxPrice')} className="mt-1" inputClassName={money} />
                  </Field>
                  <Field label={i === 0 ? 'Increment' : ''}>
                    <MoneyInput label="Increment" value={slab.step} onChange={setSlab(i, 'step')} className="mt-1" inputClassName={money} />
                  </Field>
                  <button type="button" disabled={form.bidIncrements.length < 2} onClick={() => setForm(f => ({ ...f, bidIncrements: f.bidIncrements.filter((_, j) => j !== i) }))} className="mb-1 p-2 text-slate-400 hover:text-red-600 disabled:opacity-30" aria-label="Remove increment">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, bidIncrements: [...f.bidIncrements, { maxPrice: 1000, step: 1 }] }))} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
              <Plus className="w-3.5 h-3.5" /> Add increment
            </button>
          </div>
        </Section>

        <Section title="Player info settings" text="Up to 6 extra player fields such as T-shirt size or batting position. Empty labels are not shown anywhere.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {form.playerInfoLabels.map((l, i) => (
              <Field key={i} label={`Player Info Label ${i + 1}`}>
                <input value={l} onChange={(e) => setForm(f => ({ ...f, playerInfoLabels: f.playerInfoLabels.map((x, j) => j === i ? e.target.value : x) }))} placeholder={i === 0 ? 'e.g. T-shirt size' : ''} className={input} />
              </Field>
            ))}
          </div>
        </Section>

        <Section title="Sponsors" text="Shown in the top bar of the host screen. The first one is the title sponsor.">
          <div className="space-y-2">
            {form.sponsors.map((sp, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                <Field label={i === 0 ? 'Sponsor name' : ''}>
                  <input aria-label={`Sponsor ${i + 1} name`} value={sp.name} onChange={(e) => setForm(f => ({ ...f, sponsors: f.sponsors.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} className={input} />
                </Field>
                <Field label={i === 0 ? 'Logo URL (optional)' : ''}>
                  <input type="url" aria-label={`Sponsor ${i + 1} logo`} value={sp.logo} onChange={(e) => setForm(f => ({ ...f, sponsors: f.sponsors.map((x, j) => j === i ? { ...x, logo: e.target.value } : x) }))} className={input} />
                </Field>
                <button type="button" onClick={() => setForm(f => ({ ...f, sponsors: f.sponsors.filter((_, j) => j !== i) }))} className="mb-1 p-2 text-slate-400 hover:text-red-600" aria-label="Remove sponsor"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {form.sponsors.length < 4 && (
              <button type="button" onClick={() => setForm(f => ({ ...f, sponsors: [...f.sponsors, { name: '', logo: '' }] }))} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
                <Plus className="w-3.5 h-3.5" /> Add sponsor
              </button>
            )}
          </div>
        </Section>
      </fieldset>

      {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
      {editable && (
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-xl bg-lime-500 hover:bg-lime-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950">
            {isEdit ? 'Save changes' : 'Create auction'}
          </button>
          {onBack && <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">Cancel</button>}
          {saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm font-bold text-lime-700"><CheckCircle2 className="w-4 h-4" /> {saved}</span>}
        </div>
      )}
      {/* Help box: the Auction ID is what Force Pulse asks for */}
      {isEdit && auction && (
        <div className="flex flex-col gap-2 rounded-xl bg-white px-5 py-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 shrink-0 text-lime-600" />
            Need help with bulk data, your plan or settings? The Force Pulse team will ask for your auction ID.
          </p>
          <span className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 font-mono text-sm font-bold text-lime-400">ID {shortId(activeAuction.id)}</span>
          {(FORCE_PULSE_CONTACT.phone || FORCE_PULSE_CONTACT.whatsapp || FORCE_PULSE_CONTACT.email) && (
            <p>
              Call or WhatsApp:{' '}
              {FORCE_PULSE_CONTACT.phone && <a href={`tel:${FORCE_PULSE_CONTACT.phone}`} className="font-black text-lime-700">{FORCE_PULSE_CONTACT.phone}</a>}
              {FORCE_PULSE_CONTACT.whatsapp && <> · <a href={`https://wa.me/${FORCE_PULSE_CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="font-black text-lime-700">WhatsApp</a></>}
              {FORCE_PULSE_CONTACT.email && <> · <a href={`mailto:${FORCE_PULSE_CONTACT.email}`} className="font-black text-lime-700">{FORCE_PULSE_CONTACT.email}</a></>}
            </p>
          )}
        </div>
      )}
    </form>
  );
};
