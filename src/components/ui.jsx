import React from 'react';
import logoImage from '../assets/force-pulse-logo.png';

// Force Pulse "Stadium Night" building blocks: one source for buttons, badges, tabs, stats and headings,
// so every screen shares the same look. Colours come from the theme (slate = ink navy, lime = auction gold).

const cx = (...parts) => parts.filter(Boolean).join(' ');

// ---------- Brand ----------
// The Force Pulse shield (transparent PNG, square)
export const FORCE_PULSE_LOGO = logoImage.src || logoImage;

export const LogoMark = ({ className = 'w-12 h-12' }) => (
  <img src={FORCE_PULSE_LOGO} alt="Force Pulse" className={cx('shrink-0 object-contain drop-shadow', className)} />
);

export const Logo = ({ dark = false, tagline = 'Player Auctions' }) => (
  <span className="flex items-center gap-2.5">
    <LogoMark />
    <span className="text-left leading-none">
      <span className={cx('font-bebas block text-[1.65rem]', dark ? 'text-white' : 'text-slate-950')}>
        Force <span className="text-lime-500">Pulse</span>
      </span>
      {tagline && <span className={cx('hidden sm:block text-[10px] font-extrabold uppercase tracking-[0.2em]', dark ? 'text-slate-400' : 'text-slate-500')}>{tagline}</span>}
    </span>
  </span>
);

// ---------- Buttons ----------
const BUTTON_VARIANTS = {
  primary: 'bg-lime-500 text-slate-950 hover:bg-lime-400 shadow-lg shadow-lime-500/25',
  dark: 'bg-slate-950 text-white hover:bg-slate-800',
  outline: 'border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white',
  ghostDark: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
  subtle: 'bg-slate-100 text-slate-800 hover:bg-slate-200'
};
const BUTTON_SIZES = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm sm:text-base'
};

export const Button = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => (
  <button
    {...props}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-extrabold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2',
      BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className
    )}
  >
    {children}
  </button>
);

// ---------- Badges ----------
const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  dark: 'bg-slate-950 text-white',
  gold: 'bg-lime-500 text-slate-950',
  goldSoft: 'bg-lime-100 text-lime-800',
  live: 'bg-red-600 text-white',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-700',
  glass: 'bg-white/10 text-white'
};

export const Badge = ({ tone = 'neutral', className = '', children }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider', BADGE_TONES[tone], className)}>
    {children}
  </span>
);

export const LiveDot = ({ className = 'bg-white' }) => (
  <span className="relative flex w-2 h-2">
    <span className={cx('absolute inset-0 rounded-full animate-ping opacity-75', className)} />
    <span className={cx('relative w-2 h-2 rounded-full', className)} />
  </span>
);

// Auction status, the same everywhere
export const StatusBadge = ({ status }) => {
  if (status === 'LIVE') return <Badge tone="live"><LiveDot /> Live now</Badge>;
  if (status === 'UPCOMING') return <Badge tone="goldSoft">Upcoming</Badge>;
  return <Badge tone="neutral">Completed</Badge>;
};

// ---------- Headings ----------
export const Eyebrow = ({ children, dark = false }) => (
  <span className={cx('inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em]', dark ? 'text-lime-400' : 'text-lime-700')}>
    <span className="h-0.5 w-6 bg-current" />
    {children}
  </span>
);

export const SectionHeading = ({ eyebrow, title, text, dark = false, center = false, action }) => (
  <div className={cx('flex flex-col gap-4', center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between')}>
    <div className={cx('space-y-2', center && 'max-w-2xl')}>
      {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
      <h2 className={cx('font-bebas text-4xl sm:text-5xl leading-[0.95]', dark ? 'text-white' : 'text-slate-950')}>{title}</h2>
      {text && <p className={cx('text-sm sm:text-base', dark ? 'text-slate-400' : 'text-slate-600')}>{text}</p>}
    </div>
    {action}
  </div>
);

// ---------- Surfaces ----------
export const Card = ({ dark = false, className = '', children, ...props }) => (
  <div {...props} className={cx('rounded-2xl', dark ? 'bg-slate-900 text-white ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200 shadow-sm', className)}>
    {children}
  </div>
);

// Label over a big number. `tone` colours the value.
const STAT_TONES = {
  light: { default: 'text-slate-950', gold: 'text-lime-700', good: 'text-emerald-600', bad: 'text-red-600', muted: 'text-slate-400' },
  dark: { default: 'text-white', gold: 'text-lime-400', good: 'text-emerald-400', bad: 'text-red-400', muted: 'text-slate-500' }
};
export const Stat = ({ label, value, icon: Icon, tone = 'default', dark = false, className = '' }) => (
  <div className={cx('rounded-xl px-4 py-3', dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-slate-50 ring-1 ring-slate-200', className)}>
    <span className={cx('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider', dark ? 'text-slate-400' : 'text-slate-500')}>
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </span>
    <span className={cx('mt-0.5 block text-xl font-extrabold tabular-nums', STAT_TONES[dark ? 'dark' : 'light'][tone])}>{value}</span>
  </div>
);

// ---------- Tabs ----------
// items: [{ id, label, count?, icon? }]
export const Tabs = ({ items, value, onChange, dark = false, className = '' }) => (
  <div role="tablist" className={cx('flex gap-1 overflow-x-auto rounded-xl p-1', dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200 shadow-sm', className)}>
    {items.map(({ id, label, count, icon: Icon }) => {
      const selected = value === id;
      return (
        <button
          key={id}
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(id)}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition-all',
            selected ? 'bg-slate-950 text-white shadow' : dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
          )}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {count !== undefined && (
            <span className={cx('min-w-[1.4rem] rounded-md px-1.5 py-0.5 text-[11px] font-black', selected ? 'bg-lime-500 text-slate-950' : 'bg-slate-100 text-slate-500')}>{count}</span>
          )}
        </button>
      );
    })}
  </div>
);

// Diagonal stripe texture for dark hero panels
export const Stripes = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={cx('pointer-events-none absolute inset-0', className)}
    style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 22px)' }}
  />
);

export const EmptyState = ({ icon: Icon, title, text, children }) => (
  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
    {Icon && <span className="mx-auto flex w-14 h-14 items-center justify-center rounded-xl bg-slate-950 text-lime-400"><Icon className="w-6 h-6" /></span>}
    <h3 className="mt-4 text-lg font-extrabold text-slate-950">{title}</h3>
    {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>
);
