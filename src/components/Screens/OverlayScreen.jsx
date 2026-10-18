import React, { useEffect } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Activity } from 'lucide-react';
import { formatMoney } from '../../services/money';

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
  ribbon: { name: 'Ribbon', text: 'Player photo above a slanted ribbon with the price on the left and the name on the right.' },
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
    <span className="rounded-lg p-2" style={accent}><Activity className="w-6 h-6" /></span>
    <div>
      <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>Starting soon</div>
      <div className="font-bebas text-4xl tracking-wide leading-none">{auction.title}</div>
    </div>
  </div>
);

export const OverlayScreen = () => {
  const { activeAuction: auction, currentPlayer: player, teams, activeLock } = useAuction();
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
    const sold = player?.status === 'SOLD';
    const unsold = player?.status === 'UNSOLD';
    return (
      <div className="fixed inset-x-0 bottom-0 flex justify-center pb-10 font-sans">
        {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
          <div key={player.id} className="relative w-[1200px] fp-rise">
            {/* Photo sits on the ribbon */}
            <div className="relative z-0 mx-auto -mb-3 w-56 h-60 overflow-hidden bg-slate-300 shadow-2xl">
              <img src={player.image} alt="" className={`w-full h-full object-cover ${unsold ? 'grayscale' : ''}`} />
            </div>
            <div className="relative z-10 h-36">
              {/* Accent stripe behind, slanted the other way */}
              <div className="absolute inset-0" style={{ background: theme.accent, clipPath: 'polygon(0% 12%, 97% 0%, 100% 100%, 2% 94%)' }} />
              <div
                className="absolute inset-y-2 left-6 right-4 grid grid-cols-[1fr_1.4fr] items-center px-14"
                style={{ background: theme.panel, clipPath: 'polygon(1.5% 0%, 100% 16%, 96% 100%, 0% 90%)', color: theme.accent }}
              >
                <div className="text-center">
                  <div className="text-2xl font-semibold leading-tight">
                    {sold ? 'Sold for' : unsold ? 'Unsold' : player.highestBidderTeamId ? 'Current Bid' : 'Base Price'}
                  </div>
                  <div className="text-5xl font-black leading-tight">
                    <span key={priceKey} className="fp-bid-pop">{unsold ? `${formatMoney(player.basePrice)}` : `${formatMoney(sold ? player.soldPrice : player.currentBid)}`}</span>
                  </div>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-5xl font-extrabold leading-tight truncate">{player.name}</div>
                  {team ? (
                    <div key={team.id} className="mt-1 inline-flex items-center gap-2 text-xl font-bold text-white fp-team-in">
                      <img src={team.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      {sold ? `to ${team.name}` : `${team.name} bidding`}
                    </div>
                  ) : (
                    <div className="mt-1 text-xl font-semibold text-white/80">{player.category} · {player.country}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Score bug ----------
  if (layout === 'score-bug') {
    return (
      <div className="fixed top-0 left-0 p-6 font-sans text-white">
        {waiting ? <StartingSoon auction={auction} theme={theme} panel={panel} accent={accent} /> : (
          <div key={player.id} className="flex items-stretch rounded-xl overflow-hidden shadow-2xl fp-rise" style={panel}>
            <img src={player.image} alt="" className="w-16 object-cover" />
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
              <img src={player.image} alt="" className="w-full aspect-[4/3] object-cover" />
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
                <div className="text-sm text-white/70">{player.role} · {player.country}{player.isOverseas ? ' ✈' : ''}</div>
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
            <img src={player.image} alt="" className="w-2/5 object-cover" />
            <div className="flex-1 p-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded px-3 py-1 text-sm font-black uppercase" style={accent}>{player.category}</span>
                <span className="rounded bg-white/10 px-3 py-1 text-sm font-bold">{player.country}{player.isOverseas ? ' · Overseas' : ''}</span>
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
          <img src={player.image} alt="" className="w-36 object-cover" />

          <div className="flex-1 px-6 py-4 min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-0.5 text-xs font-black uppercase" style={accent}>{player.category}</span>
              {player.isOverseas && <span className="text-xs font-bold text-amber-300">✈ Overseas</span>}
              <span className="text-xs font-bold text-white/60">{player.country}</span>
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
