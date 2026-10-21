import React, { useEffect, useRef, useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Activity, Hand, Lock, Search, X } from 'lucide-react';
import { formatMoney, moneyParts } from '../../services/money';

// Full-screen venue / projector display. The auctioneer picks what it shows from the controller
// (hostView), or a screen link can pin one view with ?screen=upcoming|sold|unsold|teams.

// Sponsor logo on a white tile (logos are usually made for light backgrounds), or the name if no logo
const SponsorBadge = ({ sponsor, big = false }) => sponsor.logo ? (
  <span className={`flex items-center justify-center rounded-xl bg-white px-3 ${big ? 'h-14 min-w-28' : 'h-10 min-w-20'}`}>
    <img src={sponsor.logo} alt={sponsor.name} className={`${big ? 'max-h-11' : 'max-h-7'} max-w-40 object-contain`} />
  </span>
) : (
  <span className={`rounded-xl border border-slate-700 bg-slate-800 px-4 font-black tracking-wide flex items-center ${big ? 'h-14 text-2xl' : 'h-10 text-base text-slate-300'}`}>
    {sponsor.name}
  </span>
);

// Presentation header: tournament on the left, sponsors in the middle, progress + Force Pulse on the right
const TopBar = ({ auction, players, rightGap = false }) => {
  const sponsors = (auction.sponsors || []).filter(s => s.name || s.logo);
  const [title, ...others] = sponsors;
  return (
    <header className={`grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-slate-700 bg-slate-950 pl-10 py-3 ${rightGap ? 'pr-28' : 'pr-10'}`}>
      <div className="flex items-center gap-4 min-w-0">
        {auction.tournamentLogo ? (
          <img src={auction.tournamentLogo} alt="" className="w-16 h-16 rounded-2xl object-contain bg-white p-1 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-lime-500 text-slate-950 flex items-center justify-center shrink-0"><Activity className="w-8 h-8" /></div>
        )}
        <div className="min-w-0">
          <div className="font-bebas text-4xl tracking-wide leading-none truncate">{auction.title}</div>
          <div className="text-sm font-bold text-slate-400 truncate">{auction.sport} · Player Auction</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        {title ? (
          <>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Presented by</span>
            <div className="flex items-center gap-3">
              <SponsorBadge sponsor={title} big />
              {others.slice(0, 3).map((s, i) => <SponsorBadge key={i} sponsor={s} />)}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-4">
        <div className="text-right text-sm font-bold text-slate-400 leading-tight">
          <div><span className="text-lime-400">{players.filter(p => p.status === 'SOLD').length}</span> sold · <span className="text-red-400">{players.filter(p => p.status === 'UNSOLD').length}</span> unsold</div>
          <div>{players.filter(p => p.status === 'UPCOMING').length} to go</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
          <span className="w-6 h-6 rounded-md bg-lime-500 text-slate-950 flex items-center justify-center"><Activity className="w-4 h-4" /></span>
          Force Pulse
        </div>
      </div>
    </header>
  );
};

// Every team's money at the top; the team bidding right now lights up with its bid
const TeamStrip = ({ teams, player, maxSquad, getTeamMaxBid }) => {
  const compact = teams.length > 8;
  const activeTeamId = player && (player.status === 'SOLD' ? player.soldToTeamId : player.status === 'CURRENT' ? player.highestBidderTeamId : null);
  return (
    <div className="flex gap-2 border-b border-slate-700 bg-slate-800/60 px-8 py-2.5 overflow-hidden">
      {teams.map(t => {
        const active = t.id === activeTeamId;
        return (
          <div
            key={t.id}
            className={`flex-1 min-w-0 flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all duration-500 ${
              active ? 'border-lime-400 bg-lime-500 text-slate-950 shadow-lg shadow-lime-500/30 scale-[1.03]' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <img src={t.logo} alt="" className={`${compact ? 'w-8 h-8' : 'w-11 h-11'} rounded-full object-cover shrink-0 border-2 ${active ? 'border-slate-950' : 'border-slate-700'}`} />
            <div className="min-w-0 leading-tight">
              <div className="font-black truncate">{compact ? t.shortCode : t.name}</div>
              <div className={`text-sm font-black ${active ? 'text-slate-950' : 'text-lime-400'}`}>{formatMoney(t.purseRemaining)}</div>
              <div className={`text-[11px] font-bold ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                {active && player.status === 'CURRENT' ? `Bidding ${formatMoney(player.currentBid)}` : active ? `Bought ${formatMoney(player.soldPrice)}` : `${t.squadCount}/${maxSquad} players`}
                {player?.status === 'CURRENT' && getTeamMaxBid && (
                  <span className="ml-1.5">· max {getTeamMaxBid(t) === Infinity ? 'no limit' : formatMoney(getTeamMaxBid(t))}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LockedScreen = ({ title }) => (
  <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
    <Lock className="w-16 h-16 text-amber-400" />
    <h2 className="font-bebas text-6xl tracking-wide">Auction locked</h2>
    <p className="max-w-xl text-lg text-slate-400">
      {title} has more teams than its plan allows. The organiser needs to contact Force Pulse to unlock it.
    </p>
  </div>
);

const Countdown = ({ startDate }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(startDate).getTime() - now;
  if (Number.isNaN(diff) || diff <= 0) return <p className="text-2xl font-bold text-lime-400">Starting shortly…</p>;
  const parts = [['Days', Math.floor(diff / 86400000)], ['Hours', Math.floor(diff / 3600000) % 24], ['Min', Math.floor(diff / 60000) % 60], ['Sec', Math.floor(diff / 1000) % 60]];
  return (
    <div className="flex justify-center gap-4">
      {parts.map(([label, v]) => (
        <div key={label} className="w-28 rounded-2xl border border-slate-700 bg-slate-800 py-4">
          <div className="font-mono text-5xl font-black text-lime-400">{String(v).padStart(2, '0')}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
};

const YetToStart = ({ auction, teams }) => (
  <div className="h-full flex flex-col items-center justify-center gap-10 text-center px-6">
    <div className="space-y-3">
      <span className="inline-block rounded-full border border-lime-500/40 bg-lime-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-[0.3em] text-lime-400">
        Bidding yet to start
      </span>
      <h1 className="font-bebas text-8xl tracking-wide">{auction.title}</h1>
      <p className="text-xl text-slate-400">{auction.sport} · Purse {formatMoney(auction.purseLimit)} per team</p>
    </div>
    <Countdown startDate={auction.startDate} />
    {teams.length > 0 && (
      <div className="flex flex-wrap justify-center gap-6">
        {teams.map(t => (
          <div key={t.id} className="flex flex-col items-center gap-2 w-28">
            <img src={t.logo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-slate-700" />
            <span className="text-sm font-bold text-slate-300 leading-tight">{t.name}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const STAT_LABELS = {
  matches: 'Matches', runs: 'Runs', wickets: 'Wickets', average: 'Average', strikeRate: 'Strike rate',
  highestScore: 'Highest score', fifties: '50s', hundreds: '100s',
  economy: 'Economy', raidPoints: 'Raid points', tacklePoints: 'Tackle points', goals: 'Goals', assists: 'Assists'
};

// Non-empty stats (zeros hidden except matches), up to 4, with readable labels
const statList = (stats) => Object.entries(stats || {})
  .filter(([k, v]) => v !== null && v !== undefined && v !== '' && (k === 'matches' || Number(v) !== 0))
  .slice(0, 4)
  .map(([k, v]) => [STAT_LABELS[k] || k.replace(/([A-Z])/g, ' $1'), v]);

const PlayerOnFloor = ({ player, teams, bids, lot, asking }) => {
  const team = teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const stats = statList(player.stats);
  const profile = [
    ['Age', player.age],
    ['Batting', player.battingStyle],
    ['Bowling', player.bowlingStyle],
    ['Previous team', player.previousTeam],
    ...Object.entries(player.extraInfo || {})
  ].filter(([, v]) => v);
  const isLive = player.status === 'CURRENT';
  const price = player.status === 'SOLD' ? player.soldPrice : (isLive && asking) || player.currentBid;
  const multiple = player.basePrice > 0 ? Math.round((price / player.basePrice) * 10) / 10 : 1;
  const latestBid = bids[0]?.id || 'none';
  const purseAfter = team && isLive ? Math.round((team.purseRemaining - player.currentBid) * 100) / 100 : team?.purseRemaining;
  const delay = (i) => ({ animationDelay: `${0.08 * i + 0.1}s` });

  return (
    <div key={player.id} className="relative h-full grid grid-cols-12 gap-8 items-center px-12 py-6">
      {/* Photo */}
      <div className="col-span-4 relative mx-auto w-full max-w-md fp-slide-in-left">
        <div className={`relative aspect-[4/5] rounded-3xl overflow-hidden border-4 bg-slate-800 shadow-2xl ${player.status === 'SOLD' ? 'border-lime-400' : player.status === 'UNSOLD' ? 'border-red-500' : 'border-slate-700'}`}>
          <img src={player.image} alt={player.name} className={`w-full h-full object-cover transition-all duration-700 ${player.status === 'UNSOLD' ? 'grayscale opacity-60' : ''}`} />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent" />
          <span className="absolute top-3 left-3 rounded-lg bg-slate-950/85 px-3 py-1 text-sm font-black tracking-wider">LOT {lot.n} / {lot.total}</span>
          {player.isOverseas && <span className="absolute top-3 right-3 rounded-lg bg-amber-400 px-3 py-1 text-sm font-black text-slate-950">✈ OVERSEAS</span>}
          <span className="absolute bottom-3 left-3 text-lg font-black">{player.country}</span>
        </div>
        {player.status === 'SOLD' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="fp-stamp rounded-2xl border-8 border-lime-400 bg-slate-950/85 px-8 py-2 font-bebas text-8xl tracking-widest text-lime-400 shadow-2xl">SOLD</span>
          </div>
        )}
        {player.status === 'UNSOLD' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="fp-stamp rounded-2xl border-8 border-red-500 bg-slate-950/85 px-8 py-2 font-bebas text-8xl tracking-widest text-red-500 shadow-2xl">UNSOLD</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="col-span-8 space-y-5 min-w-0">
        <div className="fp-rise" style={delay(0)}>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-500 px-4 py-1 text-sm font-black uppercase text-slate-950">{player.category}</span>
            <span className="rounded-full bg-slate-700 px-4 py-1 text-sm font-bold text-slate-300">Set {player.setNo}</span>
            <span className="rounded-full bg-slate-700 px-4 py-1 text-sm font-bold text-slate-300">Base {formatMoney(player.basePrice)}</span>
          </div>
          <h1 className="mt-3 font-bebas text-8xl leading-none tracking-wide truncate">{player.name}</h1>
          <p className="mt-1 text-xl text-slate-400">{player.role}</p>
        </div>

        {profile.length > 0 && (
          <div className="flex flex-wrap gap-2 fp-rise" style={delay(1)}>
            {profile.map(([k, v]) => (
              <span key={k} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm">
                <span className="text-slate-400 font-bold uppercase text-xs mr-1.5">{k}</span>
                <span className="font-extrabold">{v}</span>
              </span>
            ))}
          </div>
        )}

        {!isLive ? <ResultBanner player={player} team={team} /> : stats.length > 0 && (
          <div className={`grid gap-3 ${stats.length >= 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {stats.map(([k, v], i) => (
              <div key={k} className="rounded-2xl bg-slate-800 border border-slate-700 p-4 text-center fp-rise" style={delay(2 + i)}>
                <div className="text-3xl font-black">{v}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{k}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bid panel */}
        <div className="relative rounded-3xl border-2 border-lime-500/40 bg-slate-800 p-6 grid grid-cols-2 items-center gap-6 fp-rise" style={delay(6)}>
          <div key={latestBid} className="absolute inset-0 rounded-3xl border-2 border-transparent fp-flash pointer-events-none" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400">
              {player.status === 'SOLD' ? 'Sold for' : player.status === 'UNSOLD' ? 'Base price' : asking ? 'Asking bid' : player.highestBidderTeamId ? 'Current bid' : 'Opening bid'}
            </div>
            <div className="font-mono text-7xl font-black text-lime-400 leading-none mt-1">
              <span className="relative inline-block"><AnimatedPrice value={price} thump unitClassName="text-3xl text-white" /><RaiseTag price={price} className="-top-8 right-0 rounded-full bg-lime-400 px-3 py-1 font-sans text-lg font-black text-slate-950" /></span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-400">
              {multiple > 1 && <span className="text-amber-300">{multiple}× base · </span>}
              {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400">{player.status === 'SOLD' ? 'Sold to' : 'Leading team'}</div>
            {team ? (
              <div key={team.id} className="mt-2 fp-rise">
                <div className="flex items-center gap-4">
                  <img src={team.logo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-lime-400 shrink-0 shadow-lg shadow-lime-500/20" />
                  <div className="min-w-0">
                    <span className="block text-3xl font-black truncate">{team.name}</span>
                    <span className="text-lg font-black text-lime-400">{isLive ? 'bids' : 'paid'} {formatMoney(isLive ? player.currentBid : price)}</span>
                  </div>
                </div>
                <div className="mt-1 text-sm font-bold text-slate-400">
                  Purse {isLive ? 'after this bid' : 'left'}: <span className="text-white">{formatMoney(purseAfter)}</span> · Squad {team.squadCount}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-2xl font-bold text-slate-400 italic">{player.status === 'UNSOLD' ? 'No bids' : 'Awaiting opening bid'}</div>
            )}
          </div>

        </div>

        {/* Bid trail */}
        {bids.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mr-1">Bid trail</span>
            {bids.slice(0, 6).map((b, i) => {
              const t = teams.find(x => x.id === b.teamId);
              return (
                <span key={b.id} className={`fp-rise inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${i === 0 ? 'bg-lime-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                  {t && <img src={t.logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                  {t?.shortCode || '?'} {formatMoney(b.amount)}
                </span>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

// ---------- Shared pieces for the other designs ----------
const Stamp = ({ status, compact = false }) => status === 'CURRENT' ? null : compact ? (
  <div className="absolute inset-x-0 bottom-14 flex justify-center pointer-events-none z-10">
    <span className={`fp-stamp rounded-xl border-[6px] bg-slate-950/90 px-6 py-0.5 font-bebas text-6xl tracking-widest shadow-2xl ${status === 'SOLD' ? 'border-lime-400 text-lime-400' : 'border-red-500 text-red-500'}`}>
      {status}
    </span>
  </div>
) : (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
    <span className={`fp-stamp rounded-2xl border-8 bg-slate-950/85 px-10 py-2 font-bebas text-9xl tracking-widest shadow-2xl ${status === 'SOLD' ? 'border-lime-400 text-lime-400' : 'border-red-500 text-red-500'}`}>
      {status}
    </span>
  </div>
);

const ResultBanner = ({ player, team }) => {
  if (player.status === 'SOLD' && team) {
    return (
      <div className="w-full fp-banner-up" style={{ animationDelay: '0.35s' }}>
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-lime-500 px-6 py-4 text-slate-950 shadow-2xl">
          <img src={team.logo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-slate-950 shrink-0" />
          <span className="font-bebas text-5xl tracking-wide truncate">Sold to {team.name} · {formatMoney(player.soldPrice)}</span>
        </div>
      </div>
    );
  }
  if (player.status === 'UNSOLD') {
    return (
      <div className="w-full fp-banner-up" style={{ animationDelay: '0.35s' }}>
        <div className="rounded-2xl bg-red-600 px-6 py-4 text-center shadow-2xl">
          <span className="font-bebas text-5xl tracking-wide">Unsold · back to the pool</span>
        </div>
      </div>
    );
  }
  return null;
};

// Random draw: cycle through the pool before the chosen player is revealed
export const SHUFFLE_MS = 2600;
const ShuffleReveal = ({ pool }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => x + 1), 90);
    return () => clearInterval(t);
  }, []);
  if (pool.length === 0) return null;
  const p = pool[i % pool.length];
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 text-center px-6">
      <span className="rounded-full border border-lime-500/40 bg-lime-500/10 px-5 py-2 text-lg font-black uppercase tracking-[0.3em] text-lime-400 fp-glow">
        Drawing a random player…
      </span>
      <div className="w-72 aspect-[4/5] rounded-3xl overflow-hidden border-4 border-lime-500 shadow-2xl shadow-lime-500/20">
        <img src={p.image} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="font-bebas text-6xl tracking-wide text-slate-300">{p.name}</div>
    </div>
  );
};

// ---------- Design: Stadium ----------
// Full-bleed photo backdrop, everything centred and oversized for big LED walls
const StadiumPlayer = ({ player, teams, bids, lot, asking }) => {
  const team = teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const stats = statList(player.stats);
  const isLive = player.status === 'CURRENT';
  const price = player.status === 'SOLD' ? player.soldPrice : (isLive && asking) || player.currentBid;
  return (
    <div key={player.id} className="relative h-full overflow-hidden">
      <img src={player.image} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-20" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
      <Stamp status={player.status} />
      <div className="relative h-full flex flex-col items-center justify-center gap-3 text-center px-8 py-4">
        <div className="relative fp-rise">
          <img src={player.image} alt={player.name} className={`w-36 h-36 rounded-full object-cover border-[6px] shadow-2xl ${player.status === 'SOLD' ? 'border-lime-400' : player.status === 'UNSOLD' ? 'border-red-500 grayscale' : 'border-white/90'}`} />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-sm font-black uppercase text-slate-950 whitespace-nowrap">{player.category}</span>
        </div>
        <div className="fp-rise" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-bebas text-8xl leading-none tracking-wide mt-2">{player.name}</h1>
          <p className="mt-1 text-xl text-slate-300">
            {player.role} · {player.country}{player.isOverseas ? ' ✈' : ''}{player.age ? ` · Age ${player.age}` : ''} · Lot {lot.n}/{lot.total}
          </p>
        </div>
        {stats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 text-lg fp-rise" style={{ animationDelay: '0.2s' }}>
            {stats.map(([k, v]) => <span key={k}><strong className="text-2xl">{v}</strong> <span className="text-slate-400 uppercase text-sm font-bold">{k}</span></span>)}
          </div>
        )}
        <div className="font-mono font-black leading-none text-lime-400 text-[7rem] drop-shadow-[0_0_40px_rgba(132,204,22,0.35)]">
          {asking && <span className="block text-2xl font-black uppercase tracking-[0.3em] text-slate-300">Asking bid</span>}
          <span className="relative inline-block"><AnimatedPrice value={price} thump unitClassName="text-4xl text-white" /><RaiseTag price={price} className="-top-8 right-0 rounded-full bg-lime-400 px-3 py-1 font-sans text-lg font-black text-slate-950" /></span>
        </div>
        <div className="h-16 flex items-center">
          {team ? (
            <div key={team.id} className="flex items-center gap-4 fp-rise">
              <img src={team.logo} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white/80" />
              <span className="text-4xl font-black">{player.status === 'SOLD' ? `Sold to ${team.name}` : team.name}</span>
              {bids.length > 0 && <span className="text-lg font-bold text-slate-400">· {bids.length} bids</span>}
            </div>
          ) : (
            <span className="text-3xl font-bold text-slate-400 italic">{player.status === 'UNSOLD' ? 'No bids' : `Base price ${formatMoney(player.basePrice)} · awaiting opening bid`}</span>
          )}
        </div>
        {!isLive && <div className="w-full max-w-4xl"><ResultBanner player={player} team={team} /></div>}
      </div>
    </div>
  );
};

// ---------- Design: Team Wall ----------
// Player card plus every team's purse; the leading team lights up, teams that can't afford the next bid dim
const TeamWallPlayer = ({ player, teams, bids, lot, asking, nextBid, canBid, getTeamMaxBid }) => {
  const team = teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const stats = statList(player.stats).slice(0, 3);
  const isLive = player.status === 'CURRENT';
  const price = player.status === 'SOLD' ? player.soldPrice : (isLive && asking) || player.currentBid;
  return (
    <div key={player.id} className="relative h-full grid grid-cols-12 gap-6 px-10 py-6">
      <div className="col-span-4 relative rounded-3xl overflow-hidden border border-slate-700 bg-slate-800 flex flex-col fp-slide-in-left">
        <div className="relative flex-1 min-h-0">
          <img src={player.image} alt={player.name} className={`absolute inset-0 w-full h-full object-cover ${player.status === 'UNSOLD' ? 'grayscale opacity-60' : ''}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 rounded-lg bg-slate-950/85 px-3 py-1 text-sm font-black">LOT {lot.n}/{lot.total}</span>
          <Stamp status={player.status} />
        </div>
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-black uppercase text-slate-950">{player.category}</span>
            {player.isOverseas && <span className="rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-slate-950">OVERSEAS</span>}
          </div>
          <h1 className="font-bebas text-6xl leading-none tracking-wide truncate">{player.name}</h1>
          <p className="text-sm text-slate-400">{player.role} · {player.country}{player.age ? ` · Age ${player.age}` : ''}</p>
          {stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {stats.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-700 p-2 text-center"><div className="text-xl font-black">{v}</div><div className="text-[10px] font-bold uppercase text-slate-400">{k}</div></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col-span-8 flex flex-col gap-5 min-h-0">
        <div className="flex flex-wrap items-end justify-between gap-6 rounded-3xl border-2 border-lime-500/40 bg-slate-800 p-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400">{player.status === 'SOLD' ? 'Sold for' : asking ? 'Asking bid' : player.highestBidderTeamId ? 'Current bid' : 'Base price'}</div>
            <div className="font-mono text-7xl font-black text-lime-400 leading-none"><span className="relative inline-block"><AnimatedPrice value={price} thump unitClassName="text-3xl text-white" /><RaiseTag price={price} className="-top-8 right-0 rounded-full bg-lime-400 px-3 py-1 font-sans text-lg font-black text-slate-950" /></span></div>
            {isLive && <div className="mt-2 text-sm font-bold text-slate-400">Next bid {formatMoney(asking || nextBid)} · {bids.length} bids so far</div>}
          </div>
        </div>

        {!isLive && <ResultBanner player={player} team={team} />}

        <div className="grid grid-cols-3 gap-3 overflow-hidden content-start">
          {teams.map((t, i) => {
            const leading = team?.id === t.id;
            const able = !isLive || leading || canBid(t.id, asking || nextBid).ok;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-500 fp-rise ${
                  leading ? 'border-lime-400 bg-lime-500 text-slate-950 scale-[1.03] shadow-xl shadow-lime-500/20' : able ? 'border-slate-700 bg-slate-800' : 'border-slate-900 bg-slate-800/40 opacity-40'
                }`}
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <img src={t.logo} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-black truncate">{t.name}</div>
                  <div className={`text-xs font-bold ${leading ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatMoney(t.purseRemaining)} left · max {getTeamMaxBid(t) === Infinity ? 'no limit' : formatMoney(getTeamMaxBid(t))} · {t.squadCount} players
                  </div>
                </div>
                {leading && <span className="text-xs font-black uppercase">{player.status === 'SOLD' ? 'Won' : 'Leading'}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CANVAS_W = 1600;
const CANVAS_H = 900;
const FitCanvas = ({ children, bottomInset = 0 }) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / CANVAS_W, (window.innerHeight - bottomInset) / CANVAS_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [bottomInset]);
  return (
    <div className="fixed inset-x-0 top-0 overflow-hidden bg-slate-950 flex items-center justify-center" style={{ bottom: bottomInset }}>
      <div style={{ width: CANVAS_W, height: CANVAS_H, flex: 'none', transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
};

// Counts a stat up from 0 when the player is put on the table (static if the viewer prefers reduced motion)
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const CountUp = ({ value, duration = 1100, delay = 0 }) => {
  const target = Number(value);
  const isNum = value !== '' && Number.isFinite(target);
  const decimals = isNum ? (String(value).split('.')[1]?.length || 0) : 0;
  const [shown, setShown] = useState(isNum && !prefersReducedMotion() ? (0).toFixed(decimals) : value);
  useEffect(() => {
    if (!isNum || prefersReducedMotion()) { setShown(value); return undefined; }
    let raf;
    const start = performance.now() + delay;
    const tick = (now) => {
      const k = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - k, 3);
      setShown((target * eased).toFixed(decimals));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
};

// Price that counts up (or down) to each new value instead of jumping, with its unit (L / Cr)
const AnimatedPrice = ({ value, duration = 650, thump = false, unitClassName = '' }) => {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target || prefersReducedMotion()) { setShown(target); return undefined; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / duration);
      setShown(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const { value: text, unit } = moneyParts(shown);
  // thump: the number swells on each change (keyed inner span, so the count keeps its state)
  const number = thump
    ? <span key={target} className="fp-price-thump tabular-nums">{text}</span>
    : <span className="tabular-nums">{text}</span>;
  return <>{number}<span className={unitClassName}> {unit}</span></>;
};

// "+2 Lakh" tag that floats up off the price whenever it goes up
const RaiseTag = ({ price, className }) => {
  const prev = useRef(price);
  const [raise, setRaise] = useState(null);
  useEffect(() => {
    const diff = Math.round((price - prev.current) * 100) / 100;
    prev.current = price;
    if (diff > 0) setRaise({ diff, key: Date.now() });
  }, [price]);
  if (!raise) return null;
  return <span key={raise.key} className={`pointer-events-none absolute fp-raise-float ${className}`}>+{formatMoney(raise.diff)}</span>;
};

// Sparks bursting out from the price on every confirmed bid
const SPARK_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const BidSparks = ({ burstKey, color }) => (
  <span key={burstKey} className="pointer-events-none absolute right-24 top-1/2 h-0 w-0" aria-hidden="true">
    {SPARK_ANGLES.map(a => (
      <span key={a} className={`absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full fp-spark ${color}`} style={{ '--a': `${a}deg`, animationDelay: `${(a % 72) * 0.002}s` }} />
    ))}
  </span>
);

// Bidding bar under the player: leading team and amount, or the SOLD / UNSOLD result
const BidBar = ({ player, team, teams, bids, asking, price, width = 'w-[1200px]' }) => {
  const latestBid = bids[0]?.id || 'none';
  const multiple = player.basePrice > 0 ? Math.round((price / player.basePrice) * 10) / 10 : 1;
  return player.status === 'SOLD' && team ? (
    <div className={`${width} flex items-center gap-6 rounded-[1.75rem] bg-lime-500 px-8 py-5 text-slate-950 shadow-2xl shadow-lime-500/20 fp-banner-up`}>
      <img src={team.logo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-slate-950 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black uppercase tracking-[0.3em]">Sold to</div>
        <div className="font-bebas text-6xl leading-none tracking-wide truncate">{team.name}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-black uppercase tracking-[0.3em]">For</div>
        <div className="font-mono text-6xl font-black leading-none">{moneyParts(player.soldPrice).value}<span className="text-2xl"> {moneyParts(player.soldPrice).unit}</span></div>
      </div>
    </div>
  ) : player.status === 'UNSOLD' ? (
    <div className={`${width} rounded-[1.75rem] bg-red-600 px-8 py-7 text-center shadow-2xl fp-banner-up`}>
      <span className="font-bebas text-6xl tracking-wide">Unsold · back to the pool</span>
    </div>
  ) : (
    // Lime while a team holds the bid; amber while the auctioneer is asking a higher price
    <div className={`relative ${width} grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden rounded-[1.75rem] border-2 px-8 py-5 shadow-2xl transition-colors duration-500 ${
      asking ? 'border-amber-400 bg-gradient-to-r from-slate-800 via-slate-800 to-amber-950/60 fp-asking' : 'border-lime-500/60 bg-gradient-to-r from-slate-800 via-slate-800 to-lime-950/50'
    }`}>
      <div key={latestBid} className="absolute inset-0 rounded-[1.75rem] border-2 border-transparent fp-flash pointer-events-none" aria-hidden="true" />
      {/* Light sweep on every bid and every asking raise */}
      <div key={`shine-${latestBid}-${price}`} className={`pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent ${asking ? 'via-amber-200/25' : 'via-lime-200/25'} to-transparent fp-shine`} aria-hidden="true" />

      {team ? (
        <div key={`${team.id}-${latestBid}`} className="relative flex items-center gap-5 min-w-0 fp-team-in">
          <span className="relative shrink-0">
            <span className="absolute -inset-1.5 rounded-full border-4 border-lime-400 fp-ping" aria-hidden="true" />
            <img src={team.logo} alt="" className="relative w-24 h-24 rounded-full object-cover border-4 border-lime-400" />
          </span>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-lime-400">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" /> {asking ? `Holding at ${formatMoney(player.currentBid)}` : 'Bidding now'}
            </div>
            <div className="font-bebas text-6xl leading-none tracking-wide truncate">{team.name}</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-300 min-w-0">
              <span className="shrink-0">{formatMoney(Math.round((team.purseRemaining - player.currentBid) * 100) / 100)} left</span>
              {/* Bid trail: the last few raises, newest first */}
              {bids.length > 1 && <span className="text-slate-500">·</span>}
              {bids.slice(1, 5).map((b, i) => {
                const t = teams.find(x => x.id === b.teamId);
                return (
                  <span key={b.id} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900/70 py-0.5 pl-0.5 pr-2" style={{ opacity: 1 - i * 0.2 }}>
                    {t && <img src={t.logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                    <span className="text-xs font-black">{t?.shortCode} {formatMoney(b.amount)}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative min-w-0">
          <div className={`text-sm font-black uppercase tracking-[0.3em] ${asking ? 'text-amber-300' : 'text-slate-400'}`}>{asking ? 'Who will open the bidding?' : 'Waiting for the opening bid'}</div>
          <div className="font-bebas text-5xl leading-none tracking-wide text-slate-300">Base price {formatMoney(player.basePrice)}</div>
        </div>
      )}

      <div className="relative text-right">
        <div className={`inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] ${asking ? 'text-amber-300' : 'text-slate-400'}`}>
          {asking && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] tracking-wider text-slate-950 animate-pulse">▲ Going up</span>}
          {asking ? 'Asking bid' : player.highestBidderTeamId ? 'Current bid' : 'Opening bid'}
        </div>
        <div className={`relative font-mono text-7xl font-black leading-none ${asking ? 'text-amber-300' : 'text-lime-400'}`}>
          <RaiseTag price={price} className={`-top-6 right-0 rounded-full px-3 py-1 text-lg font-black shadow-lg ${asking ? 'bg-amber-400 text-slate-950' : 'bg-lime-400 text-slate-950'}`} />
          <span className="fp-price-glow" style={{ '--fp-glow': asking ? 'rgba(251, 191, 36, 0.55)' : 'rgba(132, 204, 22, 0.55)' }}><AnimatedPrice value={price} thump unitClassName="text-3xl text-white" /></span>
        </div>
        {multiple > 1 && <div className="text-sm font-bold text-amber-300">{multiple}× base price</div>}
      </div>
      {bids.length > 0 && !asking && <BidSparks burstKey={latestBid} color="bg-lime-300" />}
    </div>
  );
};

// ---------- Design: Player Card ----------
// One card with photo + player details; under it an animated bidding bar: team logo, name and amount
const PlayerCardDesign = ({ player, teams, bids, lot, asking }) => {
  const team = teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const stats = statList(player.stats);
  const profile = [['Age', player.age], ['Batting', player.battingStyle], ['Bowling', player.bowlingStyle], ['Previous team', player.previousTeam], ...Object.entries(player.extraInfo || {})].filter(([, v]) => v);
  const isLive = player.status === 'CURRENT';
  const price = player.status === 'SOLD' ? player.soldPrice : (isLive && asking) || player.currentBid;

  return (
    <div key={player.id} className="h-full flex flex-col items-center justify-center gap-5 px-12 py-5">
      {/* The card */}
      <div className={`relative w-[1200px] grid grid-cols-[380px_1fr] rounded-[2rem] overflow-hidden border-[3px] bg-slate-800 shadow-2xl fp-card-in ${
        player.status === 'SOLD' ? 'border-lime-400' : player.status === 'UNSOLD' ? 'border-red-500' : 'border-slate-500'
      }`}>
        <div className="relative h-[420px] overflow-hidden">
          <img src={player.image} alt={player.name} className={`absolute inset-0 w-full h-full object-cover fp-photo-zoom ${player.status === 'UNSOLD' ? 'grayscale opacity-60' : ''}`} />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent" />
          <span className="absolute top-3 left-3 rounded-lg bg-slate-950/90 px-3 py-1 text-base font-black tracking-wider">LOT {lot.n} / {lot.total}</span>
          <span className="absolute bottom-3 left-4 text-2xl font-black drop-shadow">{player.country}</span>
          <Stamp status={player.status} compact />
        </div>

        <div className="p-8 flex flex-col justify-center gap-4 min-w-0">
          <div className="flex flex-wrap gap-2 fp-rise" style={{ animationDelay: '0.45s' }}>
            <span className="rounded-full bg-orange-500 px-4 py-1 text-base font-black uppercase text-slate-950">{player.category}</span>
            {player.isOverseas && <span className="rounded-full bg-amber-400 px-4 py-1 text-base font-black text-slate-950">✈ OVERSEAS</span>}
            <span className="rounded-full bg-slate-600 px-4 py-1 text-base font-bold text-white">Set {player.setNo}</span>
            <span className="rounded-full bg-white px-4 py-1 text-base font-black text-slate-900">Base {formatMoney(player.basePrice)}</span>
          </div>
          <div className="fp-rise" style={{ animationDelay: '0.55s' }}>
            <h1 className="font-bebas text-[6.5rem] leading-[0.9] tracking-wide truncate">{player.name}</h1>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{player.role}</p>
          </div>
          {profile.length > 0 && (
            <div className="flex flex-wrap gap-2 fp-rise" style={{ animationDelay: '0.65s' }}>
              {profile.map(([k, v]) => (
                <span key={k} className="rounded-xl border border-slate-500 bg-slate-700 px-3.5 py-1.5 text-lg">
                  <span className="mr-2 text-sm font-black uppercase text-lime-300">{k}</span><span className="font-extrabold text-white">{v}</span>
                </span>
              ))}
            </div>
          )}
          {stats.length > 0 && (
            <div className={`grid gap-3 ${stats.length >= 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {stats.map(([k, v], i) => (
                <div key={k} className="rounded-2xl bg-slate-950 border-2 border-slate-600 py-3 text-center fp-rise" style={{ animationDelay: `${0.75 + i * 0.08}s` }}>
                  <div className="text-5xl font-black text-white tabular-nums"><CountUp value={v} delay={750 + i * 80} /></div>
                  <div className="mt-1 text-sm font-black uppercase tracking-wider text-lime-300">{k}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* "On the table" sweep when a new player is brought up */}
        {player.status === 'CURRENT' && !player.highestBidderTeamId && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none fp-sweep" aria-hidden="true">
            <div className="flex items-center justify-center gap-6 bg-lime-500 py-4 text-slate-950 shadow-2xl">
              <span className="font-bebas text-6xl tracking-widest">On the table</span>
              <span className="font-bebas text-4xl tracking-wide opacity-80">Lot {lot.n} / {lot.total} · {player.category}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bidding bar under the card */}
      <BidBar player={player} team={team} teams={teams} bids={bids} asking={asking} price={price} />
    </div>
  );
};

// ---------- Design: Player Profile ----------
// Poster-style profile: slanted photo panel, pink "Player Profile" tab, light first name over a bold
// surname, country and a stat sheet; the bidding bar sits underneath
const PROFILE_STATS = [
  ['Matches', s => s.matches],
  ['Runs', s => s.runs],
  ['Highest score', s => s.highestScore],
  ['Average', s => s.average],
  ['Strike rate', s => s.strikeRate],
  ['50 / 100', s => (Number(s.fifties) || Number(s.hundreds) ? `${s.fifties || 0}/${s.hundreds || 0}` : '')],
  ['Wickets', s => s.wickets],
  ['Economy', s => s.economy]
];
const profileStats = (stats = {}) => PROFILE_STATS
  .map(([label, get]) => [label, get(stats)])
  .filter(([label, v]) => v !== null && v !== undefined && v !== '' && (label === 'Matches' || Number(v) !== 0))
  .slice(0, 6);

// 16-point starburst for the corner flashes
const BURST = `polygon(${Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 ? 22 : 50;
  const a = (Math.PI * i) / 16;
  return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
}).join(', ')})`;
const PHOTO_CUT = 'polygon(0 0, 100% 0, 80% 100%, 0 100%)';

const PlayerProfileDesign = ({ auction, player, teams, bids, lot, asking }) => {
  const team = teams.find(t => t.id === (player.soldToTeamId || player.highestBidderTeamId));
  const stats = profileStats(player.stats);
  const isLive = player.status === 'CURRENT';
  const price = player.status === 'SOLD' ? player.soldPrice : (isLive && asking) || player.currentBid;
  const [first, ...rest] = String(player.name || '').trim().split(/\s+/);
  const surname = rest.join(' ') || first;
  const delay = (i) => ({ animationDelay: `${0.35 + 0.08 * i}s` });

  return (
    <div key={player.id} className="h-full flex flex-col items-center justify-center gap-5 px-12 py-5">
      <div className={`relative w-[1400px] h-[470px] overflow-hidden rounded-[2rem] border-[3px] bg-[#1d1b6e] shadow-2xl fp-card-in ${
        player.status === 'SOLD' ? 'border-lime-400' : player.status === 'UNSOLD' ? 'border-red-500' : 'border-[#2f2c9a]'
      }`}>
        {/* Backdrop: deep blue with pink and cyan bursts in the corners */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b289a] via-[#1d1b6e] to-[#110e47]" />
        <div className="absolute -top-28 -right-20 w-80 h-80 bg-pink-500" style={{ clipPath: BURST }} aria-hidden="true" />
        <div className="absolute -bottom-36 right-56 w-72 h-72 bg-cyan-400" style={{ clipPath: BURST }} aria-hidden="true" />

        {/* Photo, cut on a slant with a pink edge */}
        <div className="absolute inset-y-0 left-4 w-[600px] bg-pink-500" style={{ clipPath: PHOTO_CUT }} aria-hidden="true" />
        <div className="absolute inset-y-0 left-0 w-[600px] overflow-hidden bg-[#2b6cb0]" style={{ clipPath: PHOTO_CUT }}>
          <img src={player.image} alt={player.name} className={`absolute inset-0 w-full h-full object-cover object-top fp-photo-zoom ${player.status === 'UNSOLD' ? 'grayscale opacity-60' : ''}`} />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#110e47]/90 to-transparent" />
        </div>
        <span className="absolute top-4 left-4 rounded-lg bg-[#110e47]/90 px-3 py-1 text-base font-black tracking-wider">LOT {lot.n} / {lot.total}</span>
        {player.isOverseas && <span className="absolute bottom-4 left-4 rounded-lg bg-amber-400 px-3 py-1 text-base font-black text-slate-950">✈ OVERSEAS</span>}

        {/* Name, country and stat sheet */}
        <div className="absolute inset-y-0 left-[600px] right-14 flex flex-col justify-center py-8 min-w-0">
          <span className="self-start -skew-x-12 bg-pink-500 px-5 py-1.5 fp-rise" style={delay(0)}>
            <span className="block skew-x-12 font-oswald text-2xl font-bold uppercase tracking-wide">Player Profile</span>
          </span>
          <div className="mt-3 fp-rise" style={delay(1)}>
            {rest.length > 0 && <div className="font-oswald text-7xl font-light uppercase leading-none tracking-wide">{first}</div>}
            <h1 className={`font-oswald font-bold uppercase leading-[0.9] truncate ${surname.length > 9 ? 'text-[6.5rem]' : 'text-[8.5rem]'}`}>{surname}</h1>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap fp-rise" style={delay(2)}>
            <span className="font-oswald text-2xl uppercase tracking-[0.45em]">{player.country}</span>
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-sm font-black uppercase text-slate-950">{player.category}</span>
            <span className="rounded-full bg-white/15 px-3 py-0.5 text-sm font-bold">{player.role}</span>
            <span className="rounded-full bg-white px-3 py-0.5 text-sm font-black text-slate-900">Set {player.setNo} · Base {formatMoney(player.basePrice)}</span>
          </div>
          <div className="mt-3 h-0.5 w-full max-w-[620px] bg-white/80" />
          {stats.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-12 gap-y-1.5 max-w-[620px]">
              {stats.map(([k, v], i) => (
                <div key={k} className="flex items-baseline justify-between gap-4 font-oswald uppercase fp-rise" style={delay(3 + i)}>
                  <dt className="text-xl tracking-wide text-white/85">{k}</dt>
                  <dd className="text-2xl font-medium tabular-nums"><CountUp value={v} delay={600 + i * 80} /></dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Tournament mark, bottom right */}
        <div className="absolute bottom-5 right-8 flex items-center gap-2 max-w-[220px]">
          {auction.tournamentLogo
            ? <img src={auction.tournamentLogo} alt={auction.title} className="h-14 w-14 rounded-xl bg-white object-contain p-1" />
            : <span className="font-oswald text-lg font-bold uppercase leading-tight text-right">{auction.title}</span>}
        </div>

        <Stamp status={player.status} compact />
      </div>

      <BidBar player={player} team={team} teams={teams} bids={bids} asking={asking} price={price} width="w-[1400px]" />
    </div>
  );
};

export const HOST_DESIGNS = {
  card: { name: 'Player Card', text: 'One card with photo and details; below it an animated bar shows the bidding team and amount.' },
  profile: { name: 'Player Profile', text: 'Poster-style profile: slanted photo, bold name, country and a career stat sheet, with the bidding bar below.' },
  classic: { name: 'Classic', text: 'Photo left, profile, stats and bid panel right with a countdown ring.' },
  stadium: { name: 'Stadium', text: 'Full-screen photo backdrop with oversized name and price for big LED walls.' },
  teamwall: { name: 'Team Wall', text: 'Player card plus every team\'s purse; the leading team lights up.' }
};

// ---------- Team Lucky Draw ----------
// Logos light up one after another, then the drawn team is revealed
const DRAW_MS = 3200;
const LuckyDrawView = ({ teams, draws }) => {
  const latest = draws[0];
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!latest) return undefined;
    const left = DRAW_MS - (Date.now() - latest.at);
    if (left <= 0) { setRolling(false); return undefined; }
    setRolling(true);
    const spin = setInterval(() => setTick(t => t + 1), 110);
    const stop = setTimeout(() => { clearInterval(spin); setRolling(false); }, left);
    return () => { clearInterval(spin); clearTimeout(stop); };
  }, [latest?.id]);

  const winner = latest && teams.find(t => t.id === latest.teamId);
  const highlightId = rolling ? teams[tick % Math.max(1, teams.length)]?.id : winner?.id;
  const nameOf = (id) => teams.find(t => t.id === id)?.name || '—';

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-12">
      <div className="text-center">
        <h2 className="font-bebas text-7xl tracking-wide">Team <span className="text-lime-400">Lucky Draw</span></h2>
        {latest?.title && <p className="text-2xl font-bold text-slate-300">{latest.title}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-6 max-w-6xl">
        {teams.map(t => {
          const lit = t.id === highlightId;
          return (
            <div
              key={t.id}
              className={`w-44 rounded-3xl border-4 p-4 text-center transition-all duration-150 ${
                lit
                  ? (rolling ? 'border-amber-400 bg-amber-400/20 scale-110' : 'border-lime-400 bg-lime-500 text-slate-950 scale-125 shadow-2xl shadow-lime-500/30')
                  : `border-slate-700 bg-slate-800 ${winner && !rolling ? 'opacity-40' : ''}`
              }`}
            >
              <img src={t.logo} alt="" className="mx-auto w-24 h-24 rounded-full object-cover border-4 border-slate-900" />
              <div className="mt-2 font-black leading-tight">{t.name}</div>
            </div>
          );
        })}
      </div>
      {!latest && <p className="text-2xl font-bold text-slate-400">Waiting for the auctioneer to run the draw…</p>}
      {winner && !rolling && (
        <div key={latest.id} className="fp-banner-up rounded-2xl bg-lime-500 px-12 py-4 font-bebas text-6xl tracking-wide text-slate-950 shadow-2xl">
          {winner.name} wins the draw!
        </div>
      )}
      {draws.length > 1 && !rolling && (
        <p className="text-base font-bold text-slate-400">
          Earlier draws: {draws.slice(1, 6).map(d => `${nameOf(d.teamId)}${d.title ? ` (${d.title})` : ''}`).join(' · ')}
        </p>
      )}
    </div>
  );
};

// ---------- Auction Updates ----------
const EVENT_STYLE = {
  START: ['Started', 'bg-lime-500 text-slate-950'],
  SOLD: ['Sold', 'bg-emerald-500 text-slate-950'],
  UNSOLD: ['Unsold', 'bg-red-500 text-white'],
  REOPEN: ['Reopened', 'bg-sky-500 text-slate-950'],
  ROUND: ['New round', 'bg-violet-500 text-white'],
  DRAW: ['Lucky draw', 'bg-amber-400 text-slate-950']
};

const UpdatesView = ({ events, players, teams }) => {
  const sold = players.filter(p => p.status === 'SOLD');
  const total = Math.round(sold.reduce((sum, p) => sum + Number(p.soldPrice || 0), 0) * 100) / 100;
  const top = [...sold].sort((a, b) => b.soldPrice - a.soldPrice)[0];
  const topTeam = top && teams.find(t => t.id === top.soldToTeamId);
  return (
    <div className="h-full grid grid-cols-12 gap-8 px-12 py-8">
      <div className="col-span-8 flex flex-col gap-4 min-h-0">
        <h2 className="font-bebas text-6xl tracking-wide">Auction <span className="text-lime-400">Updates</span></h2>
        {events.length === 0 ? (
          <p className="text-2xl text-slate-400">Updates appear here as players are sold, go unsold or draws are run.</p>
        ) : (
          <ul className="space-y-3 overflow-hidden">
            {events.slice(0, 8).map((e, i) => {
              const [label, cls] = EVENT_STYLE[e.type] || ['Update', 'bg-slate-600 text-white'];
              return (
                <li key={e.id} className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3.5 fp-rise" style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-black uppercase ${cls}`}>{label}</span>
                  <span className="flex-1 text-xl font-bold truncate">{e.text}</span>
                  <span className="shrink-0 font-mono text-sm text-slate-400">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="col-span-4 flex flex-col justify-center gap-4">
        {[
          ['Players sold', sold.length],
          ['Total spend', `${formatMoney(total)}`],
          ['Unsold', players.filter(p => p.status === 'UNSOLD').length],
          ['Yet to auction', players.filter(p => p.status === 'UPCOMING').length]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-700 bg-slate-800 px-6 py-4">
            <div className="text-4xl font-black text-white">{value}</div>
            <div className="text-sm font-black uppercase tracking-wider text-lime-300">{label}</div>
          </div>
        ))}
        {top && (
          <div className="rounded-2xl border-2 border-lime-500 bg-slate-800 px-6 py-4">
            <div className="text-sm font-black uppercase tracking-wider text-lime-300">Highest buy</div>
            <div className="text-2xl font-black truncate">{top.name}</div>
            <div className="text-lg font-bold text-slate-300">{formatMoney(top.soldPrice)} · {topTeam?.name || ''}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact player row-card for the scrolling grids: photo, name, category, status and price
const TILE_STATUS = {
  UPCOMING: { label: 'Yet to auction', ring: 'border-slate-700', dot: 'bg-slate-400', text: 'text-slate-300' },
  CURRENT: { label: 'On the table', ring: 'border-amber-400 bg-amber-400/10', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' },
  SOLD: { label: 'Sold', ring: 'border-lime-500/70 bg-lime-500/10', dot: 'bg-lime-400', text: 'text-lime-400' },
  UNSOLD: { label: 'Unsold', ring: 'border-red-500/60 bg-red-500/10', dot: 'bg-red-500', text: 'text-red-400' }
};

const PlayerTile = ({ player: p, number, team, onPick, delay = 0 }) => {
  const st = TILE_STATUS[p.status] || TILE_STATUS.UPCOMING;
  const canPick = onPick && (p.status === 'UPCOMING' || p.status === 'UNSOLD');
  const price = p.status === 'SOLD' ? p.soldPrice : p.status === 'CURRENT' && team ? p.currentBid : p.basePrice;
  const priceLabel = p.status === 'SOLD' ? (team?.shortCode || 'Sold') : p.status === 'CURRENT' && team ? team.shortCode : 'Base';
  return (
    <div className={`group flex items-center gap-3 rounded-2xl border-2 bg-slate-800/80 p-2.5 transition-colors hover:border-lime-400/70 fp-rise ${st.ring}`} style={{ animationDelay: `${delay}s` }}>
      <div className="relative shrink-0">
        <img src={p.image} alt="" className={`w-14 h-14 rounded-xl object-cover bg-slate-700 ${p.status === 'UNSOLD' ? 'grayscale opacity-60' : ''}`} />
        {number != null && <span className="absolute -top-1.5 -left-1.5 min-w-[1.5rem] rounded-md bg-slate-950 px-1 text-center text-[10px] font-black leading-5 text-slate-300 ring-1 ring-slate-700">#{number}</span>}
        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-slate-800 ${st.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-extrabold leading-tight text-white" title={p.name}>{p.name}</div>
        <div className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{p.category} · {p.country}{p.isOverseas ? ' ✈' : ''}</div>
        <div className={`truncate text-[11px] font-black uppercase tracking-wide ${st.text}`}>{st.label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{priceLabel}</div>
        <div className={`text-sm font-black ${p.status === 'SOLD' ? 'text-lime-400' : 'text-slate-100'}`}>{formatMoney(price)}</div>
        {canPick && (
          <button
            onClick={() => onPick(p)}
            title={`Take ${p.name} on the table`}
            aria-label={`Take ${p.name} on the table`}
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-lime-500 text-slate-950 shadow hover:bg-lime-400 hover:scale-110 transition-transform"
          >
            <Hand className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

// Scrolling area for the player grids; the grid itself is not height-limited, so cards keep their size
const ScrollGrid = ({ children }) => (
  <div className="fp-scroll min-h-0 flex-1 overflow-y-auto pr-2 pb-4">
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{children}</div>
  </div>
);

// onPick (auctioneer's live screen only): a raised-hand button on each card puts that player on the table
const PlayerGrid = ({ title, players, teams, mode, onPick }) => {
  // Every player is listed; the grid scrolls (mouse wheel / touch) when they don't fit
  const shown = players;
  return (
    <div className="h-full flex flex-col px-12 py-6 gap-6 overflow-hidden">
      <h2 className="font-bebas text-6xl tracking-wide">{title} <span className="text-lime-400">({players.length})</span></h2>
      {players.length === 0 ? (
        <p className="text-2xl text-slate-400">No players here yet.</p>
      ) : (
        <ScrollGrid>
          {shown.map((p, i) => (
            <PlayerTile key={p.id} player={p} team={teams.find(t => t.id === p.soldToTeamId)} onPick={onPick} delay={Math.min(i, 18) * 0.03} />
          ))}
        </ScrollGrid>
      )}
    </div>
  );
};

// Every player in the auction with where they stand; filter by status and category.
// onPick (auctioneer's live screen only): raised hand on yet-to-auction / unsold cards puts that player on the table
const STATUS_FILTERS = [
  ['ALL', 'All'],
  ['UPCOMING', 'Yet to auction'],
  ['CURRENT', 'On the table'],
  ['SOLD', 'Sold'],
  ['UNSOLD', 'Unsold']
];

const AllPlayersView = ({ players, teams, onPick }) => {
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))];
  const order = [...players].sort((a, b) => (a.setNo || 0) - (b.setNo || 0));
  const q = search.trim().toLowerCase();
  const list = order.filter(p => (status === 'ALL' || p.status === status) && (category === 'ALL' || p.category === category)
    && (!q || p.name.toLowerCase().includes(q)));
  // Every match is listed; the grid scrolls (mouse wheel / touch) when they don't fit
  const shown = list;
  const chip = (on) => `rounded-full px-4 py-1.5 text-base font-black transition-colors ${on ? 'bg-lime-500 text-slate-950' : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`;

  return (
    <div className="h-full flex flex-col px-12 py-5 gap-4 overflow-hidden">
      <div className="flex items-end justify-between gap-6">
        <h2 className="font-bebas text-6xl leading-none tracking-wide">All Players <span className="text-lime-400">({list.length})</span></h2>
        <div className="flex flex-wrap justify-end gap-2">
          {STATUS_FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setStatus(id)} className={chip(status === id)}>
              {label} <span className="opacity-70">{id === 'ALL' ? players.length : players.filter(p => p.status === id).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex w-80 items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 focus-within:border-lime-500">
          <Search className="w-4 h-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player name"
            aria-label="Search player name"
            className="w-full min-w-0 bg-transparent text-base font-bold text-white placeholder:text-slate-500 outline-none"
          />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>}
        </label>
        {categories.length > 1 && [['ALL', 'All categories'], ...categories.map(c => [c, c])].map(([id, label]) => (
          <button key={id} onClick={() => setCategory(id)} className={chip(category === id)}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-2xl text-slate-400">{q ? `No player named "${search.trim()}"${status !== 'ALL' || category !== 'ALL' ? ' with these filters' : ''}.` : 'No players match.'}</p>
      ) : (
        <ScrollGrid>
          {shown.map((p, i) => (
            <PlayerTile
              key={p.id}
              player={p}
              number={order.indexOf(p) + 1}
              team={teams.find(t => t.id === (p.soldToTeamId || p.highestBidderTeamId))}
              onPick={onPick}
              delay={Math.min(i, 18) * 0.03}
            />
          ))}
        </ScrollGrid>
      )}
    </div>
  );
};

const TeamsBoard = ({ teams, getTeamMaxBid, maxSquad }) => (
  <div className="h-full flex flex-col px-12 py-6 gap-6">
    <h2 className="font-bebas text-6xl tracking-wide">Teams &amp; <span className="text-lime-400">Purse</span></h2>
    <div className="rounded-3xl border border-slate-700 overflow-hidden">
      <table className="w-full text-left text-xl">
        <thead className="bg-slate-800 text-sm uppercase tracking-wider text-slate-400">
          <tr><th className="p-4">Team</th><th className="p-4 text-right">Players</th><th className="p-4 text-right">Spent</th><th className="p-4 text-right">Purse left</th><th className="p-4 text-right">Max bid</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {teams.map(t => (
            <tr key={t.id}>
              <td className="p-4"><div className="flex items-center gap-3"><img src={t.logo} alt="" className="w-12 h-12 rounded-full object-cover" /><span className="font-black">{t.name}</span></div></td>
              <td className="p-4 text-right font-bold">{t.squadCount}/{maxSquad}</td>
              <td className="p-4 text-right">{formatMoney(t.spent)}</td>
              <td className="p-4 text-right font-black text-lime-400">{formatMoney(t.purseRemaining)}</td>
              <td className="p-4 text-right text-slate-300">{getTeamMaxBid(t) === Infinity ? 'No limit' : `${formatMoney(getTeamMaxBid(t))}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const HostScreen = ({ forcedView, forcedDesign, bottomInset = 0, rightGap = false, onPickPlayer }) => {
  const {
    activeAuction: auction, teams, players, currentPlayer, hostView, activeLock,
    getTeamMaxBid, bidHistory, runSettings, shuffleAt, nextBidAmount, askingBid, canTeamBid, auctionQueue, luckyDraws, auctionEvents
  } = useAuction();

  // Random draw animation, shown on every host screen when the controller draws a player
  const [shuffling, setShuffling] = useState(false);
  useEffect(() => {
    if (!shuffleAt) return undefined;
    const left = SHUFFLE_MS - (Date.now() - shuffleAt);
    if (left <= 0) return undefined;
    setShuffling(true);
    const t = setTimeout(() => setShuffling(false), left);
    return () => { clearTimeout(t); setShuffling(false); };
  }, [shuffleAt]);

  if (!auction) return null;
  const design = HOST_DESIGNS[forcedDesign] ? forcedDesign : (HOST_DESIGNS[runSettings.hostDesign] ? runSettings.hostDesign : 'card');

  const view = forcedView || hostView || 'AUTO';
  let body;
  if (activeLock.locked) body = <LockedScreen title={auction.title} />;
  else if (view === 'UPCOMING') body = <AllPlayersView players={players} teams={teams} onPick={onPickPlayer} />;
  else if (view === 'SOLD') body = <PlayerGrid title="Sold Players" mode="SOLD" players={players.filter(p => p.status === 'SOLD').sort((a, b) => b.soldPrice - a.soldPrice)} teams={teams} />;
  else if (view === 'UNSOLD') body = <PlayerGrid title="Unsold Players" players={players.filter(p => p.status === 'UNSOLD')} teams={teams} onPick={onPickPlayer} />;
  else if (view === 'LUCKY_DRAW') body = <LuckyDrawView teams={teams} draws={luckyDraws} />;
  else if (view === 'UPDATES') body = <UpdatesView events={auctionEvents} players={players} teams={teams} />;
  else if (view === 'TEAMS') body = <TeamsBoard teams={teams} getTeamMaxBid={getTeamMaxBid} maxSquad={auction.maxSquadSize} />;
  else if (auction.status === 'UPCOMING' || !currentPlayer) body = <YetToStart auction={auction} teams={teams} />;
  else if (shuffling) body = <ShuffleReveal pool={[currentPlayer, ...auctionQueue].sort(() => Math.random() - 0.5)} />;
  else {
    // Lot number: position in the auction order (set, then list order)
    const order = [...players].sort((a, b) => (a.setNo || 0) - (b.setNo || 0));
    const props = {
      player: currentPlayer,
      teams,
      bids: bidHistory.filter(b => b.playerId === currentPlayer.id),
      lot: { n: order.findIndex(p => p.id === currentPlayer.id) + 1, total: players.length },
      asking: askingBid
    };
    if (design === 'card') body = <PlayerCardDesign {...props} />;
    else if (design === 'profile') body = <PlayerProfileDesign {...props} auction={auction} />;
    else if (design === 'stadium') body = <StadiumPlayer {...props} />;
    else if (design === 'teamwall') body = <TeamWallPlayer {...props} nextBid={nextBidAmount} canBid={canTeamBid} getTeamMaxBid={getTeamMaxBid} />;
    else body = <PlayerOnFloor {...props} />;
  }

  return (
    <FitCanvas bottomInset={bottomInset}>
    <div className="h-full w-full overflow-hidden bg-slate-950 text-white flex flex-col">
      <TopBar auction={auction} players={players} rightGap={rightGap} />

      {/* Team money at the top; hidden on the Teams view, which shows the full table */}
      {!activeLock.locked && teams.length > 0 && view !== 'TEAMS' && !(design === 'teamwall' && view === 'AUTO' && currentPlayer && !shuffling) && (
        <TeamStrip teams={teams} player={shuffling ? null : currentPlayer} maxSquad={auction.maxSquadSize} getTeamMaxBid={getTeamMaxBid} />
      )}

      <main className="relative flex-1 min-h-0">{body}</main>
    </div>
    </FitCanvas>
  );
};
