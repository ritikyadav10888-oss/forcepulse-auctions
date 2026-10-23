import React, { useState } from 'react';
import {
  ArrowRight, Zap, ShieldCheck, Tv, Calendar,
  FileSpreadsheet, Layers, Undo2, PlusCircle, UserPlus, Gavel,
  Mail, Phone, MessageCircle, Search, Radio, Users, Link2, MonitorPlay, Check
} from 'lucide-react';
import { useAuction, isPublicAuction } from '../../context/AuctionContext';
import { FORCE_PULSE_CONTACT, PLANS as PLAN_LIMITS } from '../../config/forcePulse';
import { AuctionCard } from './BrowseAuctions';
import { Button, Badge, LiveDot, SectionHeading, Stripes, Tabs, EmptyState } from '../ui';

const REASONS = [
  { icon: Zap, title: 'Real-time bidding engine', text: 'Every bid, sale and purse update reaches every screen the moment the auctioneer accepts it. No refreshing, no lag.' },
  { icon: ShieldCheck, title: 'Rules enforced automatically', text: 'Purse limits, squad size, overseas quotas and minimum-squad reserves are checked on every bid.' },
  { icon: Tv, title: 'Big-screen & stream ready', text: 'Put the live arena on a projector or your YouTube / Facebook stream while you run bidding from a laptop.' },
  { icon: Layers, title: 'Any sport, any format', text: 'Cricket, football, kabaddi, volleyball, badminton and more, with your own categories and bid steps.' },
  { icon: Undo2, title: 'Fair & transparent', text: 'A full bid log, one-click undo for auctioneer mistakes and the same rules for every team.' },
  { icon: FileSpreadsheet, title: 'Squads & exports instantly', text: 'Rosters, spend summaries and sold/unsold lists are ready the moment the hammer falls.' }
];

// How it works, one set of steps per kind of visitor
const GUIDES = [
  {
    id: 'ORGANISER',
    label: 'Organise an auction',
    steps: [
      { icon: UserPlus, title: 'Sign up', text: 'Create a free account. One login gives you your own dashboard.' },
      { icon: PlusCircle, title: 'Create your auction', text: 'Set the sport, date, team purse, squad limits and bid increments.' },
      { icon: Users, title: 'Add teams & players', text: 'Add franchises, then players one by one or from an Excel/CSV sheet.' },
      { icon: Link2, title: 'Share the registration link', text: 'Players sign up through your link and you approve them into the pool.' },
      { icon: MonitorPlay, title: 'Open the screens', text: 'Live arena on a projector, the overlay on your stream.' },
      { icon: Gavel, title: 'Go live', text: 'Run bidding from the auctioneer console. Every bid reaches every screen.' }
    ]
  },
  {
    id: 'VIEWER',
    label: 'Watch an auction',
    steps: [
      { icon: Search, title: 'Browse auctions', text: 'Pick Live, Upcoming or Past. No login needed.' },
      { icon: Radio, title: 'Watch live', text: 'Follow the player on the floor, the current bid and every purse.' },
      { icon: Users, title: 'Check squads & results', text: 'See who each team bought, for how much, and the sold/unsold lists.' }
    ]
  }
];

const PLAN_PRICES = { FREE: 'Free', STANDARD: '₹3,000', PREMIER: '₹5,000', MEGA: '₹8,000' };
const PLAN_POINTS = ['Live bidding & purse rules', 'Host screen & stream overlay', 'Player registration link', 'Squads & results pages'];

const HIGHLIGHTS = ['Real-time bids', 'Any sport', 'Projector & stream ready', 'Rules enforced', 'Excel import', 'One-click undo'];

// Live auctions first, then the next upcoming ones, then the latest results
const STATUS_ORDER = { LIVE: 0, UPCOMING: 1, PAST: 2 };
const FEATURED_COUNT = 3;

const CONTACT_LINKS = [
  FORCE_PULSE_CONTACT.email && { icon: Mail, label: 'Email', value: FORCE_PULSE_CONTACT.email, href: `mailto:${FORCE_PULSE_CONTACT.email}` },
  FORCE_PULSE_CONTACT.phone && { icon: Phone, label: 'Call', value: FORCE_PULSE_CONTACT.phone, href: `tel:${FORCE_PULSE_CONTACT.phone}` },
  FORCE_PULSE_CONTACT.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: `https://wa.me/${FORCE_PULSE_CONTACT.whatsapp}` }
].filter(Boolean);

export const PublicHome = ({ onBrowse, onOpenAuction, onOrganise }) => {
  const { auctions } = useAuction();
  const [guideId, setGuideId] = useState(GUIDES[0].id);
  const guide = GUIDES.find(g => g.id === guideId);
  const featured = auctions
    .filter(isPublicAuction)
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || (a.status === 'PAST'
      ? new Date(b.startDate) - new Date(a.startDate)
      : new Date(a.startDate) - new Date(b.startDate)))
    .slice(0, FEATURED_COUNT);
  const spotlight = featured[0];
  const [lead, ...reasons] = REASONS;

  return (
    <div className="space-y-20 pb-20">

      {/* Hero */}
      <section className="relative -mt-6 w-screen ml-[calc(50%-50vw)] overflow-hidden bg-slate-950 text-white">
        <Stripes />
        <div className="absolute -right-32 -top-40 w-[36rem] h-[36rem] rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 h-40 w-2/3 -skew-x-12 translate-x-24 bg-lime-500/10 pointer-events-none" />

        <div className="relative grid gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-8 lg:py-20 max-w-7xl mx-auto">
          <div className="space-y-7">
            <Badge tone="glass" className="ring-1 ring-white/15">
              {spotlight?.status === 'LIVE' ? <><LiveDot className="bg-red-500" /> An auction is live now</> : 'Player auction platform'}
            </Badge>

            <h1 className="font-bebas text-6xl leading-[0.88] sm:text-7xl xl:text-8xl">
              Feel the pulse<br />of <span className="relative inline-block text-lime-400">every bid.<span className="absolute -bottom-1 left-0 h-2 w-full -skew-x-12 bg-lime-500/30" /></span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Run your league's player auction from start to finish: live bidding, team purses, squads and a
              big-screen broadcast, all in one place, for any sport.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onBrowse}>Browse auctions <ArrowRight className="w-4 h-4" /></Button>
              <Button size="lg" variant="ghostDark" onClick={onOrganise}><Gavel className="w-4 h-4 text-lime-400" /> Organise an auction</Button>
            </div>
          </div>

          {/* No auction's teams or purses on the front page; auctions are listed further down */}
          <div className="rounded-2xl bg-slate-900/80 p-6 ring-1 ring-white/10">
            <Gavel className="w-8 h-8 text-lime-400" />
            <p className="mt-3 font-bebas text-3xl leading-none">Your league, on the big screen.</p>
            <p className="mt-2 text-sm text-slate-400">Live bidding, team purses and squads on every screen, from the venue projector to your stream.</p>
          </div>
        </div>

        {/* Highlights strip */}
        <div className="relative border-t border-white/10 bg-lime-500 text-slate-950">
          <ul className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-2 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.18em] sm:justify-between">
            {HIGHLIGHTS.map(h => <li key={h} className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> {h}</li>)}
          </ul>
        </div>
      </section>

      {/* Featured auctions */}
      <section id="featured" className="scroll-mt-24 space-y-8">
        <SectionHeading
          eyebrow="Featured"
          title="On the auction floor"
          text="Jump into live bidding or preview what's coming up next."
          action={<Button variant="outline" size="sm" onClick={onBrowse}>All auctions <ArrowRight className="w-4 h-4" /></Button>}
        />
        {featured.length === 0 ? (
          <EmptyState icon={Calendar} title="No featured auctions yet" text="Check back soon, or organise your own." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(auc => <AuctionCard key={auc.id} auction={auc} onOpen={onOpenAuction} />)}
          </div>
        )}
      </section>

      {/* Why Force Pulse: one lead card, five supporting ones */}
      <section className="space-y-8">
        <SectionHeading eyebrow="Why Force Pulse" title="Built for auction day" text="For professional leagues, corporate tournaments and club auctions that want everything to just work." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white md:row-span-2 flex flex-col justify-between">
            <Stripes />
            <div className="relative">
              <span className="flex w-12 h-12 items-center justify-center rounded-lg bg-lime-500 text-slate-950"><lead.icon className="w-6 h-6" /></span>
              <h3 className="mt-6 font-bebas text-4xl leading-none">{lead.title}</h3>
              <p className="mt-3 text-slate-300">{lead.text}</p>
            </div>
            <p className="relative mt-8 font-bebas text-7xl leading-none text-lime-500/90">0.1s</p>
          </div>
          {reasons.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className={`group rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:ring-lime-500 ${i === reasons.length - 1 ? 'md:col-span-2 lg:col-span-3' : ''}`}>
              <span className="flex w-10 h-10 items-center justify-center rounded-lg bg-slate-950 text-lime-400 transition-colors group-hover:bg-lime-500 group-hover:text-slate-950"><Icon className="w-5 h-5" /></span>
              <h3 className="mt-4 text-base font-extrabold text-slate-950">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-to-use" className="scroll-mt-24 space-y-8">
        <SectionHeading
          eyebrow="How it works"
          title="From sign-up to sold"
          text="Running your own auction or just following one? Pick your guide."
          action={<Tabs items={GUIDES.map(g => ({ id: g.id, label: g.label }))} value={guideId} onChange={setGuideId} />}
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guide.steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
              <span className="absolute -right-2 -top-6 font-bebas text-[7rem] leading-none text-slate-100" aria-hidden="true">{i + 1}</span>
              <div className="relative">
                <span className="flex w-10 h-10 items-center justify-center rounded-lg bg-lime-500 text-slate-950"><Icon className="w-5 h-5" /></span>
                <h3 className="mt-4 font-extrabold text-slate-950"><span className="text-lime-700">Step {i + 1} · </span>{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex justify-center">
          {guideId === 'ORGANISER'
            ? <Button size="lg" onClick={onOrganise}><Gavel className="w-4 h-4" /> Start organising</Button>
            : <Button size="lg" variant="dark" onClick={onBrowse}>Browse auctions <ArrowRight className="w-4 h-4 text-lime-400" /></Button>}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-white sm:px-10">
        <Stripes />
        <div className="relative space-y-10">
          <SectionHeading dark center eyebrow="Pricing" title="Pay for teams, not features" text="Every plan includes the full software. Pick the one that fits your number of teams." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_LIMITS.map(plan => {
              const highlight = plan.id === 'PREMIER';
              return (
                <div key={plan.id} className={`relative flex flex-col rounded-2xl p-6 ${highlight ? 'bg-lime-500 text-slate-950' : 'bg-white/5 ring-1 ring-white/10'}`}>
                  {highlight && <Badge tone="dark" className="absolute -top-3 left-6">Most popular</Badge>}
                  <span className={`text-xs font-extrabold uppercase tracking-[0.18em] ${highlight ? 'text-slate-800' : 'text-slate-400'}`}>{plan.name}</span>
                  <span className="mt-2 font-bebas text-5xl leading-none">{PLAN_PRICES[plan.id] || '—'}</span>
                  <span className={`mt-1 text-sm font-bold ${highlight ? 'text-slate-800' : 'text-lime-400'}`}>Up to {plan.teamLimit} teams</span>
                  <ul className={`mt-5 flex-1 space-y-2 text-sm ${highlight ? 'text-slate-900' : 'text-slate-300'}`}>
                    {PLAN_POINTS.map(p => <li key={p} className="flex gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5" /> {p}</li>)}
                  </ul>
                  <Button className="mt-6 w-full" variant={highlight ? 'dark' : 'primary'} onClick={onOrganise}>
                    {plan.price === 0 ? 'Start free' : 'Choose plan'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact + closing call to action */}
      <section id="contact" className="scroll-mt-24 relative overflow-hidden rounded-3xl bg-lime-500 px-6 py-12 text-slate-950 sm:px-12">
        <div className="absolute -right-10 top-0 h-full w-1/3 -skew-x-12 bg-lime-400 pointer-events-none" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-3">
            <h2 className="font-bebas text-5xl leading-[0.9] sm:text-6xl">Ready for auction day?</h2>
            <p className="max-w-xl text-base font-semibold text-slate-900">
              Planning a league auction or need more teams? Start free, or talk to the Force Pulse team and we'll set it up with you.
            </p>
          </div>
          <div className="space-y-3">
            <Button size="lg" variant="dark" className="w-full" onClick={onOrganise}><Gavel className="w-4 h-4 text-lime-400" /> Organise an auction</Button>
            {CONTACT_LINKS.map(({ icon: Icon, label, value, href }) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                className="flex items-center gap-3 rounded-lg bg-slate-950/10 px-4 py-3 font-bold hover:bg-slate-950/20">
                <Icon className="w-4 h-4" /> <span className="text-xs uppercase tracking-wider">{label}</span> <span className="ml-auto truncate">{value}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
