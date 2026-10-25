import React, { useEffect, useRef, useState } from 'react';
import { PlayerPhoto } from '../PlayerPhoto';
import { useAuction } from '../../context/AuctionContext';
import { FORCE_PULSE_LOGO } from '../ui';
import { formatMoney } from '../../services/money';
import { SHUFFLE_MS } from './HostScreen';

// Stream graphics for YouTube / Facebook live. Add to OBS (or vMix / Streamlabs) as a Browser Source
// at 1920×1080; the page background is transparent, so several layouts can be stacked as separate sources.
// ?layout=lower-third|side-card|score-bug|full-card|ribbon|purse-ticker  ·  ?theme=lime|dark|crimson
// ?bg=green for software that needs a chroma-key background.

export const OVERLAY_THEMES = {
  lime: { name: 'Force Pulse Lime', accent: '#84cc16', panel: '#0f172a', text: '#0f172a' },
  dark: { name: 'Midnight Blue', accent: '#38bdf8', panel: '#020617', text: '#020617' },
  crimson: { name: 'Crimson Gold', accent: '#f59e0b', panel: '#7f1d1d', text: '#1c1917' },
  gold: { name: 'Navy & Gold', accent: '#facc15', panel: '#1b2654', text: '#1b2654' }
};

export const OVERLAY_LAYOUTS = {
  'lower-third': { name: 'Lower third', text: 'Full-width bar along the bottom: photo, name, bid, team, clock.' },
  'side-card': { name: 'Side card', text: 'Tall player card on the right edge, leaves the stage visible.' },
  'score-bug': { name: 'Score bug', text: 'Compact corner badge with the current bid; least intrusive.' },
  'full-card': { name: 'Full card', text: 'Centered player card for breaks or the reveal moment.' },
  ribbon: { name: 'Ribbon', text: "Player intro (photo card left; name, role, age, jersey and base price right; camera stays visible), then a slanted ribbon with the bid and a sold card with the team logo (top right)." },
  'purse-ticker': { name: 'Purse ticker', text: 'Top strip with every team\'s remaining purse. Stack it with any other layout.' }
};

const priceText = (p) => p.status === 'UNSOLD' ? 'UNSOLD' : `${formatMoney(p.status === 'SOLD' ? p.soldPrice : p.currentBid)}`;
const priceLabel = (p) => p.status === 'SOLD' ? 'Sold for' : p.status === 'UNSOLD' ? 'Result' : p.highestBidderTeamId ? 'Current bid' : 'Base price';

const StatusBlock = ({ status, accent }) => (
  <div className={`flex items-center justify-center px-6 font-bebas text-5xl tracking-widest ${status === 'SOLD' ? '' : 'bg-red-600'}`} style={status === 'SOLD' ? accent : undefined}>
    {status}
  </div>
);

const StartingSoon = ({ auction, theme, panel, accent, className = '' }) => (
  <div className={`inline-flex items-center gap-4 rounded-2xl px-6 py-4 shadow-2xl fp-rise ${className}`} style={panel}>
    <img src={FORCE_PULSE_LOGO} alt="" className="w-12 h-12 object-contain" />
    <div>
      <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Starting soon</div>
      <div className="font-bebas text-4xl tracking-wide leading-none">{auction.title}</div>
    </div>
  </div>
);

// The ribbon is drawn on a 1920×1080 stage scaled to fit the browser source, so it keeps its shape at any
// source size (1280×720, a cropped box, …) instead of spilling past the edges.
const STAGE_W = 1920;
const STAGE_H = 1080;
// A source that is not 16:9 stretches the stage on its long side, so the ribbon still sits on the bottom edge
// and the table in the top corner.
// Some browser inputs (vMix) report a 0×0 window while the page first loads and never fire resize after,
// so an unknown size falls back to the full stage and the size is re-checked for a few seconds.
const Stage = ({ children }) => {
  const fit = () => {
    const vw = window.innerWidth || document.documentElement.clientWidth || STAGE_W;
    const vh = window.innerHeight || document.documentElement.clientHeight || STAGE_H;
    const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
    return { scale, w: vw / scale, h: vh / scale };
  };
  const [box, setBox] = useState(fit);
  useEffect(() => {
    const onResize = () => setBox(prev => {
      const next = fit();
      return next.scale === prev.scale && next.w === prev.w && next.h === prev.h ? prev : next;
    });
    window.addEventListener('resize', onResize);
    const timer = setInterval(onResize, 500);
    const stop = setTimeout(() => clearInterval(timer), 10000);
    return () => { window.removeEventListener('resize', onResize); clearInterval(timer); clearTimeout(stop); };
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: box.w, height: box.h, transform: `scale(${box.scale})`, transformOrigin: '0 0' }}
      >
        {children}
      </div>
    </div>
  );
};

// Ribbon, in two steps when a player comes on the table: (1) the introduction, a photo card on the left and
// the name, role, age, jersey and base price on the right, with the camera still visible between them; (2) the ribbon along
// the bottom (photo, price, player name and the bidding team).
const INTRO_MS = 6000;
const INTRO_SHADOW = '0 0 3px #000, 0 0 3px #000, 0 0 6px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.7)';
// Random draw on the stream: photos and names flick through the pool (camera still visible around them) before
// the drawn player's introduction starts, timed like the host screen's draw
const OverlayDraw = ({ pool, theme }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => x + 1), 90);
    return () => clearInterval(t);
  }, []);
  if (pool.length === 0) return null;
  const p = pool[i % pool.length];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 font-sans text-white" style={{ textShadow: INTRO_SHADOW }}>
      <span className="rounded-full px-8 py-3 text-4xl font-black uppercase tracking-[0.3em] shadow-2xl fp-glow" style={{ background: theme.accent, color: theme.text, textShadow: 'none' }}>
        Drawing a random player…
      </span>
      <div className="h-[560px] w-[450px] overflow-hidden rounded-[2.5rem] bg-slate-800 shadow-2xl ring-[10px] fp-card-in" style={{ '--tw-ring-color': theme.accent }}>
        <img src={p.image} alt="" className="w-full h-full object-cover object-top" />
      </div>
      <div className="font-bebas text-[7rem] leading-none tracking-wide">{p.name}</div>
    </div>
  );
};

// Ribbon price: counts up to each new amount with a pop, and a "+0.1 Lakh" tag floats off it on every rise
const RisingPrice = ({ value, color }) => {
  const [shown, setShown] = useState(value);
  const [rise, setRise] = useState(null);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    const diff = Math.round((value - start) * 10000) / 10000;
    if (diff > 0) setRise({ diff, key: Date.now() });
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 500);
      setShown(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span key={value} className="fp-bid-pop" style={{ color }}>{formatMoney(Math.round(shown * 10000) / 10000)}</span>
      {rise && <span key={rise.key} className="pointer-events-none absolute -top-6 -right-10 rounded-full px-3 py-1 text-2xl font-black fp-raise-float" style={{ background: color, color: '#0f172a' }}>+{formatMoney(rise.diff)}</span>}
    </span>
  );
};

const RibbonOverlay = ({ player, team, squadTarget, theme, asking }) => {
  const live = player.status === 'CURRENT';
  // A player already decided (sold / unsold) skips the introduction
  const [intro, setIntro] = useState(live);
  useEffect(() => {
    if (!intro) return undefined;
    const t = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(t);
  }, [intro]);
  const sold = player.status === 'SOLD';
  const unsold = player.status === 'UNSOLD';
  const raised = live && asking ? asking : null;
  const facts = [
    ['Role', player.role || player.category],
    ['Age', player.age],
    ['Jersey', player.jerseyNumber ? `#${player.jerseyNumber}` : null],
    ['Base price', player.basePrice ? formatMoney(player.basePrice) : null]
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');

  // Step 1: introduction
  if (intro) {
    return (
      <div className="absolute inset-0 flex items-center justify-between px-24 font-sans text-white">
        <div className="relative h-[860px] w-[640px] overflow-hidden rounded-[2.5rem] bg-slate-800 shadow-2xl ring-[10px] fp-slide-in-left" style={{ '--tw-ring-color': theme.accent }}>
          <img src={player.image} alt="" className="w-full h-full object-cover object-top fp-photo-zoom" />
        </div>
        {/* No card behind the details: the camera shows through, a heavy shadow keeps the text readable */}
        <div className="w-[900px]" style={{ textShadow: INTRO_SHADOW }}>
          <div className="text-4xl font-black uppercase tracking-[0.3em] fp-slide-in-right" style={{ color: theme.accent }}>Next on the table</div>
          <div className="mt-4 font-bebas text-[10rem] leading-[0.88] tracking-wide fp-slide-in-right" style={{ animationDelay: '0.15s' }}>{player.name}</div>
          <div className="my-7 h-2.5 w-56 rounded-full shadow-lg fp-sweep-in" style={{ background: theme.accent, animationDelay: '0.3s' }} />
          <dl className="grid gap-5">
            {facts.map(([k, v], i) => (
              <div key={k} className="flex items-center gap-8 border-l-[10px] pl-7 fp-slide-in-right" style={{ borderColor: theme.accent, animationDelay: `${0.45 + i * 0.18}s` }}>
                <dt className="w-64 shrink-0 text-3xl font-black uppercase tracking-widest text-white">{k}</dt>
                <dd className="text-7xl font-extrabold" style={{ color: theme.accent }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  // Step 2: the ribbon and the sold card
  return (
    <>
      <div className="absolute bottom-0 left-0 pb-12 pl-12 font-sans">
        <div className="relative w-[900px] fp-rise">
          <div className="relative z-0 mx-auto -mb-3 w-48 h-56 overflow-hidden rounded-t-2xl bg-slate-300 shadow-2xl ring-[6px] fp-photo-rise" style={{ '--tw-ring-color': theme.accent }}>
            <img src={player.image} alt="" className={`w-full h-full object-cover object-top fp-photo-zoom ${unsold ? 'grayscale' : ''}`} />
            {(sold || unsold) && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className={`rounded-xl px-4 py-1 font-bebas text-6xl tracking-widest shadow-2xl ring-4 ring-white fp-stamp ${unsold ? 'bg-red-600 text-white' : ''}`} style={sold ? { background: theme.accent, color: theme.text } : undefined}>
                  {sold ? 'SOLD' : 'UNSOLD'}
                </span>
              </div>
            )}
          </div>
          <div className="relative z-10 h-52">
            {/* Accent stripe behind, slanted the other way */}
            <div className="absolute inset-0" style={{ background: theme.accent, clipPath: 'polygon(0% 12%, 97% 0%, 100% 100%, 2% 94%)' }} />
            <div
              className="absolute inset-y-2 left-6 right-4 px-16"
              style={{ background: theme.panel, clipPath: 'polygon(1.5% 0%, 100% 16%, 96% 100%, 0% 90%)', color: theme.accent }}
            >
              <div className="grid h-full grid-cols-[1fr_1.8fr] items-center gap-4">
                <div className="text-center">
                  {/* While the auctioneer raises the price with +, the number rises to it in amber with no label */}
                  <div className="min-h-[2.25rem] text-3xl font-bold leading-tight">
                    {raised ? '' : sold ? 'Sold for' : unsold ? 'Unsold' : player.highestBidderTeamId ? 'Current Bid' : 'Base Price'}
                  </div>
                  <div className="text-7xl font-black leading-tight">
                    <RisingPrice value={raised || (unsold ? player.basePrice : sold ? player.soldPrice : player.currentBid)} color={raised ? '#fbbf24' : theme.accent} />
                  </div>
                </div>
                <div className="min-w-0 text-center">
                  <div className="truncate text-6xl font-extrabold leading-tight">{player.name}</div>
                  {team && (
                    <div key={team.id} className="mt-2 flex min-w-0 items-center justify-center gap-3 text-4xl font-bold text-white fp-team-in">
                      <img src={team.logo} alt="" className="w-12 h-12 shrink-0 rounded-full bg-white object-contain" />
                      <span className="truncate">{team.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {sold && team && <SoldCard key={team.id} team={team} price={player.soldPrice} squadTarget={squadTarget} theme={theme} />}
    </>
  );
};

// Top-right corner once a player is sold: the buying team's logo, name and price
const SoldCard = ({ team, price, squadTarget, theme }) => (
  <div className="absolute right-12 top-12 w-[680px] font-sans text-white fp-card-in">
    <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-4" style={{ background: theme.panel, '--tw-ring-color': theme.accent }}>
      <div className="absolute inset-0 fp-sweep" style={{ background: `linear-gradient(100deg, transparent 30%, ${theme.accent}55 50%, transparent 70%)` }} />
      <div className="relative flex items-center gap-8 p-8">
        <div className="relative shrink-0">
          <img src={team.logo} alt="" className="w-44 h-44 rounded-full bg-white object-contain p-2 shadow-2xl ring-8 fp-bid-pop" style={{ '--tw-ring-color': theme.accent }} />
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-4 py-0.5 font-bebas text-4xl tracking-widest shadow-xl fp-stamp" style={{ background: theme.accent, color: theme.text, animationDelay: '0.35s' }}>SOLD</span>
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Sold to</div>
          <div className="truncate text-5xl font-extrabold leading-tight">{team.name}</div>
          <div className="mt-2 text-7xl font-black leading-none fp-bid-pop" style={{ color: theme.accent }}>{formatMoney(price)}</div>
          <div className="mt-3 text-2xl font-bold text-white/80">Squad {team.squadCount}/{squadTarget} · Purse {formatMoney(team.purseRemaining)}</div>
        </div>
      </div>
    </div>
  </div>
);

export const OverlayScreen = () => {
  const { activeAuction: auction, currentPlayer: player, teams, activeLock, askingBid, shuffleAt, auctionQueue } = useAuction();
  // Random draw: same window as the host screens, starting when the controller draws a player
  const [shuffling, setShuffling] = useState(false);
  useEffect(() => {
    if (!shuffleAt) return undefined;
    const left = SHUFFLE_MS - (Date.now() - shuffleAt);
    if (left <= 0) return undefined;
    setShuffling(true);
    const t = setTimeout(() => setShuffling(false), left);
    return () => { clearTimeout(t); setShuffling(false); };
  }, [shuffleAt]);
  const params = new URLSearchParams(window.location.search);
  const layout = OVERLAY_LAYOUTS[params.get('layout')] ? params.get('layout') : 'lower-third';
  // The ribbon defaults to its navy & gold look; every layout accepts any theme
  const theme = OVERLAY_THEMES[params.get('theme')] || (layout === 'ribbon' ? OVERLAY_THEMES.gold : OVERLAY_THEMES.lime);
  const chroma = params.get('bg') === 'green';

  useEffect(() => {
    const bg = chroma ? '#00b140' : 'transparent';
    const prev = [document.documentElement.style.background, document.body.style.background];
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    return () => {
      document.documentElement.style.background = prev[0];
      document.body.style.background = prev[1];
    };
  }, [chroma]);

  if (!auction || activeLock.locked) return null;

  const accent = { backgroundColor: theme.accent, color: theme.text };
  const panel = { backgroundColor: theme.panel };
  const waiting = !player || auction.status === 'UPCOMING';
  const team = player && teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const priceKey = player ? `${player.id}-${player.currentBid}-${player.status}` : 'none';

  // ---------- Purse ticker ----------
  if (layout === 'purse-ticker') {
    return (
      <div className="fixed inset-x-0 top-0 p-4 font-sans text-white">
        <div className="flex items-stretch rounded-xl overflow-hidden shadow-2xl" style={panel}>
          <span className="flex items-center px-4 font-bebas text-2xl tracking-wider" style={accent}>PURSE</span>
          <div className="flex flex-1 items-center gap-6 overflow-hidden whitespace-nowrap px-4 py-2">
            {teams.map(t => (
              <span key={t.id} className={`inline-flex items-center gap-2 text-lg font-bold ${team?.id === t.id && player?.status === 'CURRENT' ? 'fp-glow' : ''}`}>
                <img src={t.logo} alt="" className="w-7 h-7 rounded-full object-cover" />
                {t.shortCode}
                <span style={{ color: theme.accent }}>{formatMoney(t.purseRemaining)}</span>
                <span className="text-white/50 text-sm">({t.squadCount})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Ribbon ----------
  if (layout === 'ribbon') {
    return (
      <Stage>
        {waiting
          ? <div className="absolute inset-x-0 bottom-0 flex justify-center pb-12 font-sans"><StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /></div>
          : shuffling
            ? <OverlayDraw pool={[player, ...(auctionQueue || [])].sort(() => Math.random() - 0.5)} theme={theme} />
            : <RibbonOverlay key={player.id} player={player} team={team} squadTarget={auction.maxSquadSize || auction.minSquadSize || 11} theme={theme} asking={askingBid} />}
      </Stage>
    );
  }

  // ---------- Score bug ----------
  if (layout === 'score-bug') {
    return (
      <div className="fixed top-0 left-0 p-6 font-sans text-white">
        {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
          <div key={player.id} className="flex items-stretch rounded-xl overflow-hidden shadow-2xl fp-rise" style={panel}>
            <div className="relative w-16 shrink-0"><PlayerPhoto src={player.image} /></div>
            <div className="px-4 py-2 min-w-0">
              <div className="font-bebas text-3xl leading-none tracking-wide truncate max-w-[16rem]">{player.name}</div>
              <div className="text-xs font-bold text-white/70">{player.category} · {team ? team.shortCode : 'No bid'}</div>
            </div>
            <div className="flex items-center px-4 font-mono text-3xl font-black" style={accent}>
              <span key={priceKey} className="fp-bid-pop">{priceText(player)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Side card ----------
  if (layout === 'side-card') {
    return (
      <div className="fixed right-0 top-0 bottom-0 flex items-center p-8 font-sans text-white">
        {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
          <div key={player.id} className="w-96 rounded-3xl overflow-hidden shadow-2xl fp-slide-in-left" style={panel}>
            <div className="relative">
              <div className="relative w-full aspect-[4/3]"><PlayerPhoto src={player.image} /></div>
              <span className="absolute top-3 left-3 rounded px-2 py-0.5 text-xs font-black uppercase" style={accent}>{player.category}</span>
              {player.status !== 'CURRENT' && (
                <span className={`absolute inset-x-0 bottom-0 py-2 text-center font-bebas text-4xl tracking-widest fp-banner-up ${player.status === 'SOLD' ? '' : 'bg-red-600'}`} style={player.status === 'SOLD' ? accent : undefined}>
                  {player.status}
                </span>
              )}
            </div>
            <div className="p-5 space-y-3">
              <div>
                <div className="font-bebas text-5xl leading-none tracking-wide">{player.name}</div>
                <div className="text-sm text-white/70">{player.role}{player.isOverseas ? ' ✈' : ''}</div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-white/60">{priceLabel(player)}</div>
                  <div className="font-mono text-4xl font-black" style={{ color: theme.accent }}><span key={priceKey} className="fp-bid-pop">{priceText(player)}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-lg font-extrabold">
                {team ? <><img src={team.logo} alt="" className="w-8 h-8 rounded-full object-cover" />{team.name}</> : <span className="text-white/50 text-base">Awaiting bid · base {formatMoney(player.basePrice)}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Full card ----------
  if (layout === 'full-card') {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-10 font-sans text-white">
        {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
          <div key={player.id} className="flex rounded-3xl overflow-hidden shadow-2xl max-w-5xl w-full fp-rise" style={panel}>
            <div className="relative w-2/5 shrink-0"><PlayerPhoto src={player.image} /></div>
            <div className="flex-1 p-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded px-3 py-1 text-sm font-black uppercase" style={accent}>{player.category}</span>
                <span className="rounded bg-white/10 px-3 py-1 text-sm font-bold">{player.isOverseas ? 'Overseas' : player.category}</span>
                {player.age && <span className="rounded bg-white/10 px-3 py-1 text-sm font-bold">Age {player.age}</span>}
              </div>
              <div className="font-bebas text-7xl leading-none tracking-wide">{player.name}</div>
              <div className="text-lg text-white/70">{player.role}</div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(player.stats || {}).filter(([, v]) => v).slice(0, 3).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/10 p-3 text-center">
                    <div className="text-2xl font-black">{v}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">{k.replace(/([A-Z])/g, ' $1')}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-white/60">{priceLabel(player)}</div>
                  <div className="font-mono text-6xl font-black" style={{ color: theme.accent }}><span key={priceKey} className="fp-bid-pop">{priceText(player)}</span></div>
                </div>
                <div className="text-right">
                  {team && <div className="flex items-center gap-2 text-2xl font-black"><img src={team.logo} alt="" className="w-10 h-10 rounded-full object-cover" />{team.name}</div>}
                  {player.status !== 'CURRENT' && <div className={`mt-2 inline-block rounded-xl px-4 py-1 font-bebas text-4xl tracking-widest fp-stamp ${player.status === 'SOLD' ? '' : 'bg-red-600'}`} style={player.status === 'SOLD' ? accent : undefined}>{player.status}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Lower third (default) ----------
  return (
    <div className="fixed inset-x-0 bottom-0 p-6 sm:p-10 font-sans text-white">
      {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
        <div key={player.id} className="flex items-stretch rounded-2xl overflow-hidden shadow-2xl max-w-6xl fp-banner-up" style={panel}>
          <div className="relative w-36 shrink-0"><PlayerPhoto src={player.image} /></div>

          <div className="flex-1 px-6 py-4 min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-0.5 text-xs font-black uppercase" style={accent}>{player.category}</span>
              {player.isOverseas && <span className="text-xs font-bold text-amber-300">✈ Overseas</span>}
            </div>
            <div className="font-bebas text-6xl leading-none tracking-wide mt-1 truncate">{player.name}</div>
            <div className="text-sm text-white/70">{player.role} · Base {formatMoney(player.basePrice)}</div>
          </div>

          <div className="flex flex-col justify-center px-6 py-4 border-l border-white/10 text-right">
            <div className="text-xs font-black uppercase tracking-widest text-white/60">{priceLabel(player)}</div>
            <div className="font-mono text-5xl font-black leading-none" style={{ color: theme.accent }}>
              <span key={priceKey} className="fp-bid-pop">{priceText(player)}</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 text-lg font-extrabold">
              {team ? (
                <>
                  <img src={team.logo} alt="" className="w-7 h-7 rounded-full object-cover" />
                  {player.status === 'SOLD' ? `to ${team.name}` : team.name}
                </>
              ) : (
                <span className="text-white/50 text-base">{player.status === 'UNSOLD' ? 'No bids' : 'Awaiting bid'}</span>
              )}
            </div>
          </div>

          {player.status !== 'CURRENT' && <StatusBlock status={player.status} accent={accent} />}
        </div>
      )}
    </div>
  );
};
