import React from 'react';
import { PlayerPhoto } from '../PlayerPhoto';
import { useAuction } from '../../context/AuctionContext';
import { Gavel, Radio, TrendingUp, Plane, ArrowUpRight, Youtube } from 'lucide-react';
import { formatMoney, moneyParts } from '../../services/money';
import { youtubeEmbedUrl } from '../../services/youtube';
import { Badge, Card, EmptyState, LiveDot, Stripes } from '../ui';

// Stats shown under the player's name, in this order, when filled in
const SPOTLIGHT_STATS = [
  ['matches', 'Matches'], ['runs', 'Runs'], ['wickets', 'Wickets'], ['average', 'Average'],
  ['strikeRate', 'Strike rate'], ['economy', 'Economy'], ['highestScore', 'Highest']
];

// Public live spotlight: the YouTube video, the player on the floor and the bid feed (or the Sold-to card).
// On a live auction it sits above the page tabs, so it never changes when a viewer switches tabs.
export const LiveSpotlight = () => {
  const { activeAuction, currentPlayer, teams, players, bidHistory, getTeamMaxBid, nextBidAmount } = useAuction();
  const maxSquad = activeAuction?.maxSquadSize || 0;

  const video = activeAuction?.status === 'LIVE' ? youtubeEmbedUrl(activeAuction.youtubeUrl) : '';

  if (!currentPlayer) {
    return (
      <div className="space-y-8">
        {video && <LiveVideo src={video} title={activeAuction.title} />}
        <EmptyState icon={Radio} title="Between lots" text="The next player will appear here as soon as the auctioneer puts them on the floor." />
      </div>
    );
  }

  const p = currentPlayer;
  const leading = teams.find(t => t.id === (p.soldToTeamId || p.highestBidderTeamId));
  const bids = bidHistory.filter(b => !b.playerId || b.playerId === p.id);
  const price = p.status === 'SOLD' ? p.soldPrice : p.currentBid;
  const { value, unit } = moneyParts(price);
  // Small facts under the name, when known
  const details = [['Age', p.age], ['Jersey', [p.jerseyName, p.jerseyNumber && `#${p.jerseyNumber}`].filter(Boolean).join(' ')], ['From', p.previousTeam]]
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  const stats = SPOTLIGHT_STATS
    .map(([k, label]) => [label, p.stats?.[k]])
    // Blank or zero stats are hidden (imported players often have none)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && Number(v) !== 0)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {video && <LiveVideo src={video} title={activeAuction.title} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Spotlight */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-900/10" aria-label="Player on the floor">
          <Stripes />
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-lime-500/15 blur-3xl pointer-events-none" />

          <div className="relative grid sm:grid-cols-[300px_1fr]">
            <div className="relative h-56 sm:h-full sm:min-h-[26rem] bg-slate-800">
              <PlayerPhoto src={p.image} alt={p.name} className={p.status === 'UNSOLD' ? 'grayscale opacity-60' : ''} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-slate-950" />
              <Badge tone="dark" className="absolute left-3 top-3">Set {p.setNo}</Badge>
            </div>

            <div className="space-y-3 p-4 sm:space-y-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {p.status === 'CURRENT' && <Badge tone="live"><LiveDot /> On the floor</Badge>}
                {p.status === 'SOLD' && <Badge tone="gold">Sold</Badge>}
                {p.status === 'UNSOLD' && <Badge tone="danger">Unsold</Badge>}
                <Badge tone="glass">{p.category}</Badge>
                {p.isOverseas && <Badge tone="glass"><Plane className="w-3 h-3" /> Overseas</Badge>}
              </div>

              <div>
                <h2 className="font-bebas text-4xl leading-[0.9] sm:text-6xl">{p.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">{p.role}</p>
                {details.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {details.map(([label, v]) => (
                      <span key={label} className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">
                        <span className="text-slate-400">{label}</span> {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {stats.length > 0 && (
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-4">
                  {stats.map(([label, v]) => (
                    <div key={label} className="bg-slate-950/80 px-3 py-2.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                      <dd className="text-lg font-extrabold tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Price + leading team */}
              <div className={`flex flex-wrap items-end justify-between gap-3 rounded-xl p-4 sm:gap-4 sm:p-5 ${p.status === 'SOLD' ? 'bg-lime-500 text-slate-950' : p.status === 'UNSOLD' ? 'bg-red-600' : 'bg-white/5 ring-1 ring-lime-500/40'}`}>
                <div>
                  <span className={`text-xs font-extrabold uppercase tracking-[0.18em] ${p.status === 'CURRENT' ? 'text-slate-400' : ''}`}>
                    {p.status === 'SOLD' ? 'Sold for' : p.status === 'UNSOLD' ? 'No bids at base' : p.highestBidderTeamId ? 'Current bid' : 'Opening bid'}
                  </span>
                  <div className="font-bebas text-5xl leading-none tabular-nums sm:text-7xl">
                    <span className={p.status === 'CURRENT' ? 'text-lime-400' : ''}>{value}</span>
                    <span className="ml-1.5 text-2xl">{unit}</span>
                  </div>
                  <span className={`text-xs font-bold ${p.status === 'CURRENT' ? 'text-slate-400' : ''}`}>Base {formatMoney(p.basePrice)}</span>
                  {p.status === 'CURRENT' && p.highestBidderTeamId && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-lime-500/15 px-2 py-0.5 text-xs font-extrabold text-lime-300"><ArrowUpRight className="w-3 h-3" /> Next bid {formatMoney(nextBidAmount)}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-extrabold uppercase tracking-[0.18em] ${p.status === 'CURRENT' ? 'text-slate-400' : ''}`}>
                    {p.status === 'SOLD' ? 'Sold to' : 'Leading'}
                  </span>
                  {leading ? (
                    <div className="mt-1.5 flex items-center justify-end gap-2.5">
                      <div className="min-w-0 text-right">
                        <div className="truncate text-xl font-extrabold leading-tight">{leading.name}</div>
                        <div className={`text-xs font-bold ${p.status === 'CURRENT' ? 'text-slate-400' : ''}`}>{formatMoney(leading.purseRemaining)} left</div>
                      </div>
                      <img src={leading.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white/10 object-contain" />
                    </div>
                  ) : (
                    <div className="mt-1 text-sm font-bold opacity-80">{p.status === 'UNSOLD' ? 'Back to the pool' : 'Waiting for the first bid'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Once sold, the buying team's squad takes the bid feed's place on the same screen */}
        {p.status === 'SOLD' && leading ? (
          <SoldToCard team={leading} player={p} players={players} maxSquad={maxSquad} />
        ) : (
        <Card className="flex flex-col rounded-3xl p-5">
          <h3 className="flex items-center gap-2 font-bebas text-2xl text-slate-950">
            <TrendingUp className="w-4 h-4 text-lime-600" /> Bid feed
            {bids.length > 0 && <span className="ml-auto text-xs font-bold text-slate-500">{bids.length} {bids.length === 1 ? 'bid' : 'bids'}</span>}
          </h3>
          {bids.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Gavel className="w-8 h-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Bids for {p.name.split(' ')[0]} will appear here as they come in.</p>
            </div>
          ) : (
            <ol className="mt-4 space-y-2 max-h-[26rem] overflow-y-auto pr-1">
              {bids.map((b, i) => {
                const t = teams.find(x => x.id === b.teamId);
                return (
                  <li key={b.id || i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-lime-50 ring-2 ring-lime-400' : 'bg-slate-50'}`}>
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{bids.length - i}</span>
                    {t && <img src={t.logo} alt="" className="h-8 w-8 shrink-0 rounded-md bg-white object-contain ring-1 ring-slate-200" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-950">{t?.name || 'Team'}</div>
                      {(i === 0 || b.time) && <div className="text-[11px] font-semibold text-slate-500">{i === 0 ? 'Highest bid' : b.time}</div>}
                    </div>
                    <span className={`font-bebas text-2xl leading-none tabular-nums ${i === 0 ? 'text-lime-700' : 'text-slate-700'}`}>{formatMoney(b.amount)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
        )}
      </div>

    </div>
  );
};

// The organiser's YouTube live stream, muted until the viewer turns the sound on
const LiveVideo = ({ src, title }) => (
  <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-slate-950 shadow-xl shadow-slate-900/10" aria-label="Live video">
    <div className="flex items-center gap-2 px-5 py-3 text-white">
      <Youtube className="w-5 h-5 text-red-500" />
      <span className="font-bebas text-2xl leading-none">Watch live</span>
      <Badge tone="live" className="ml-1"><LiveDot /> Live</Badge>
    </div>
    <div className="relative aspect-video w-full bg-black">
      <iframe
        src={src}
        title={`${title} live video`}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  </section>
);

// The team that just bought the player: its money and full squad, with the new signing highlighted
const SoldToCard = ({ team, player, players, maxSquad }) => {
  const squad = players
    .filter(x => x.status === 'SOLD' && x.soldToTeamId === team.id)
    .sort((a, b) => Number(b.soldPrice || 0) - Number(a.soldPrice || 0));
  const total = Number(team.initialPurse || 0);
  const used = squad.reduce((s, x) => s + Number(x.soldPrice || 0), 0);
  return (
    <Card className="flex flex-col overflow-hidden" aria-label={`Sold to ${team.name}`}>
      <div className="bg-slate-950 p-5 text-white">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-400">Sold to</span>
        <div className="mt-2 flex items-center gap-3">
          <img src={team.logo} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white/5 object-contain ring-2 ring-lime-500" />
          <h3 className="min-w-0 truncate font-bebas text-3xl leading-none">{team.name}</h3>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[['Used', formatMoney(used), 'text-red-400'], ['Balance', formatMoney(total - used), 'text-emerald-400'], ['Players', `${squad.length}/${maxSquad || '–'}`, 'text-white']].map(([label, v, tone]) => (
            <div key={label} className="rounded-lg bg-white/5 px-1 py-2 ring-1 ring-white/10">
              <div className={`whitespace-nowrap font-bebas text-xl leading-none ${tone}`}>{v}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
      <ol className="flex-1 max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
        {squad.map((x, i) => {
          const isNew = x.id === player.id;
          return (
            <li key={x.id} className={`flex items-center gap-2.5 px-4 py-2.5 ${isNew ? 'bg-lime-50' : ''}`}>
              <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <img src={x.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover object-top bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-950">{x.name}</div>
                <div className="truncate text-[11px] font-semibold text-slate-500">{isNew ? 'New signing' : (x.role || x.category)}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${isNew ? 'bg-lime-500 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>{formatMoney(x.soldPrice)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
