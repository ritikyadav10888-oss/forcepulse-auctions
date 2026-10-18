import React, { useState } from 'react';
import {
  Activity, ArrowRight, Zap, ShieldCheck, Tv, Calendar,
  FileSpreadsheet, Layers, Undo2, PlusCircle, UserPlus, Gavel,
  Mail, Phone, MessageCircle, Search, Radio, Users, Link2, MonitorPlay
} from 'lucide-react';
import { useAuction, isPublicAuction } from '../../context/AuctionContext';
import { FORCE_PULSE_CONTACT } from '../../config/forcePulse';
import { AuctionCard } from './BrowseAuctions';

const REASONS = [
  {
    icon: Zap,
    title: 'Real-time bidding engine',
    text: 'Every bid, sale and purse update reaches every screen the moment the auctioneer accepts it. No refreshing, no lag.'
  },
  {
    icon: ShieldCheck,
    title: 'Rules enforced automatically',
    text: 'Purse limits, squad size, overseas quotas and minimum-squad reserves are checked on every bid, so no team overspends.'
  },
  {
    icon: Tv,
    title: 'Big-screen & stream ready',
    text: 'Open the live arena on a projector or capture it for YouTube and Facebook Live while you run the auction from your laptop.'
  },
  {
    icon: Layers,
    title: 'Any sport, any format',
    text: 'Cricket, football, kabaddi, volleyball, badminton and more, with your own categories, base prices and bid increments.'
  },
  {
    icon: Undo2,
    title: 'Fair & transparent',
    text: 'A full bid log, one-click undo for auctioneer mistakes and the same bidding rules for every team.'
  },
  {
    icon: FileSpreadsheet,
    title: 'Squads & exports instantly',
    text: 'Team rosters, spend summaries and sold/unsold lists are ready the moment the hammer falls. Export to Excel in a click.'
  }
];

// How to Use guide, one set of steps per kind of visitor
const GUIDES = [
  {
    id: 'ORGANISER',
    label: 'Organise an auction',
    steps: [
      { icon: UserPlus, title: 'Sign up', text: 'Create a free account with Sign Up. One login gives you your own dashboard.' },
      { icon: PlusCircle, title: 'Create your auction', text: 'Set the sport, date, team purse, squad limits and bid increments.' },
      { icon: Users, title: 'Add teams & players', text: 'Add franchises, then add players one by one or import them from an Excel/CSV sheet.' },
      { icon: Link2, title: 'Share the registration link', text: 'Players can sign up themselves through your link. You approve them into the pool.' },
      { icon: MonitorPlay, title: 'Open the screens', text: 'Put the live arena on a projector or the overlay on your YouTube / Facebook stream.' },
      { icon: Gavel, title: 'Go live', text: 'Run bidding from the auctioneer console. Every bid reaches every screen instantly.' }
    ]
  },
  {
    id: 'VIEWER',
    label: 'Watch an auction',
    steps: [
      { icon: Search, title: 'Browse auctions', text: 'Open Browse Auctions and pick Live, Upcoming or Past. No login needed.' },
      { icon: Radio, title: 'Watch live', text: 'Open a live auction to follow the player on the floor, the current bid and the purses.' },
      { icon: Users, title: 'Check squads & results', text: 'See every team, who they bought and for how much, and the sold/unsold lists.' }
    ]
  }
];


const PLANS = [
  { name: 'Starter League', price: 'FREE', teams: 'Up to 2 teams', highlight: false },
  { name: 'Standard League', price: '₹3,000', teams: 'Up to 4 teams', highlight: false },
  { name: 'Premier League', price: '₹5,000', teams: 'Up to 10 teams', highlight: true },
  { name: 'Mega Championship', price: '₹8,000', teams: 'Up to 32 teams', highlight: false }
];

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

  return (
    <div className="space-y-16 pb-20">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white px-6 py-12 sm:px-12 sm:py-16">
        <div className="absolute -right-24 -top-24 w-[28rem] h-[28rem] rounded-full bg-lime-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/40 bg-lime-400/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-lime-300">
              <Activity className="w-3.5 h-3.5" />
              Force Pulse · Player Auction Platform
            </span>

            <h1 className="font-bebas text-5xl sm:text-7xl leading-[0.95] tracking-wide">
              Feel the pulse of<br />
              <span className="text-lime-400">every bid.</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">
              Force Pulse runs your league's player auction from start to finish. Live bidding, team purses, squads
              and a big-screen broadcast, all in one place, for any sport.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onBrowse}
                className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-500/20 transition-all hover:bg-lime-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                Browse Auctions
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOrganise}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800"
              >
                <Gavel className="w-4 h-4 text-lime-400" />
                Organise an Auction
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured auctions */}
      <section id="featured" className="scroll-mt-32 xl:scroll-mt-24 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-lime-600">Featured</span>
            <h2 className="font-bebas text-4xl sm:text-5xl tracking-wide text-slate-900">Featured auctions</h2>
            <p className="text-sm text-slate-500">Jump into live bidding or preview what's coming up next.</p>
          </div>
          <button onClick={onBrowse} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900 hover:text-lime-700">
            See all auctions <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700">No featured auctions yet</h3>
            <p className="text-sm text-slate-500">Check back soon, or organise your own.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(auc => <AuctionCard key={auc.id} auction={auc} onOpen={onOpenAuction} />)}
          </div>
        )}
      </section>

      {/* Why choose Force Pulse */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-lime-600">Why Force Pulse</span>
          <h2 className="font-bebas text-4xl sm:text-5xl tracking-wide text-slate-900">Why choose Force Pulse?</h2>
          <p className="text-sm text-slate-500">
            Built for professional leagues, corporate tournaments and club auctions that want a smooth auction day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REASONS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-lime-400 hover:shadow-md">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center transition-colors group-hover:bg-lime-500 group-hover:text-slate-950">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Use */}
      <section id="how-to-use" className="scroll-mt-32 xl:scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-lime-600">How to use</span>
          <h2 className="font-bebas text-4xl sm:text-5xl tracking-wide text-slate-900">How to use Force Pulse</h2>
          <p className="text-sm text-slate-500">Running your own auction or just following one? Pick your guide.</p>
        </div>

        <div className="flex justify-center">
          <div role="tablist" className="inline-flex gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
            {GUIDES.map(g => (
              <button
                key={g.id}
                role="tab"
                aria-selected={guideId === g.id}
                onClick={() => setGuideId(g.id)}
                className={`rounded-xl px-4 sm:px-5 py-2 text-sm font-extrabold transition-all ${
                  guideId === g.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guide.steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-lime-500 text-slate-950 flex items-center justify-center font-black text-lg">
                {i + 1}
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
                  <Icon className="w-4 h-4 text-lime-600" /> {title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap justify-center gap-3">
          {guideId === 'ORGANISER' ? (
            <button onClick={onOrganise} className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-lime-400">
              <Gavel className="w-4 h-4" /> Start organising
            </button>
          ) : (
            <button onClick={onBrowse} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Browse Auctions <ArrowRight className="w-4 h-4 text-lime-400" />
            </button>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-32 xl:scroll-mt-24 rounded-3xl bg-slate-900 text-white p-8 sm:p-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="bg-lime-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Transparent pricing
          </span>
          <h2 className="font-bebas text-4xl tracking-wide">Choose your tournament plan</h2>
          <p className="text-sm text-slate-400">Pay only for the number of teams. Full software included.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-5 text-center space-y-4 ${
                plan.highlight ? 'border-lime-500 bg-slate-800 ring-2 ring-lime-500/30' : 'border-slate-700 bg-slate-800'
              }`}
            >
              <span className="block text-xs font-bold uppercase text-slate-400">{plan.name}</span>
              <div className={`text-3xl font-black ${plan.price === 'FREE' ? 'text-lime-400' : 'text-white'}`}>{plan.price}</div>
              <p className="text-xs text-slate-400">{plan.teams}</p>
              <button
                onClick={onOrganise}
                className={`w-full rounded-xl py-2.5 text-xs font-black ${
                  plan.price === 'FREE' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-lime-500 text-slate-950 hover:bg-lime-400'
                }`}
              >
                {plan.price === 'FREE' ? 'Get started free' : 'Select plan'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-32 xl:scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-lime-600">Contact us</span>
          <h2 className="font-bebas text-4xl tracking-wide text-slate-900">Talk to the Force Pulse team</h2>
          <p className="text-sm text-slate-500">
            Planning a league auction or need more teams? Get in touch and we'll help you set it up.
          </p>
        </div>

        {CONTACT_LINKS.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CONTACT_LINKS.map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-lime-400 hover:bg-white"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center group-hover:bg-lime-500 group-hover:text-slate-950">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
                  <span className="block truncate text-sm font-extrabold text-slate-900">{value}</span>
                </span>
              </a>
            ))}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={onOrganise}
            className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-lime-400"
          >
            <Gavel className="w-4 h-4" /> Organise an Auction
          </button>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="text-center space-y-4">
        <h2 className="font-bebas text-4xl tracking-wide text-slate-900">See an auction in action</h2>
        <button
          onClick={onBrowse}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white hover:bg-slate-800"
        >
          Browse Auctions <ArrowRight className="w-4 h-4 text-lime-400" />
        </button>
      </section>
    </div>
  );
};
