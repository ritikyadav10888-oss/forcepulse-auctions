import React, { useEffect, useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Newspaper } from 'lucide-react';
import { formatMoney } from '../../services/money';
import { Badge, Card, EmptyState } from '../ui';

// Look of each kind of update; anything else reads as a plain update
const KINDS = {
  BID: ['Bid', 'goldSoft'],
  SOLD: ['Sold', 'gold'],
  UNSOLD: ['Unsold', 'danger'],
  REOPEN: ['Back on table', 'neutral'],
  ROUND: ['New round', 'neutral'],
  START: ['Started', 'live'],
  DRAW: ['Lucky draw', 'neutral']
};

const ago = (ms) => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Public "Updates" tab: every bid, sale, unsold player and new round as it happens, newest first
export const LiveUpdates = () => {
  const { auctionEvents, bidHistory, players, teams } = useAuction();
  // "12s ago" labels keep moving
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const playerName = (id) => players.find(p => p.id === id)?.name || 'a player';
  const team = (id) => teams.find(t => t.id === id);
  const items = [
    ...auctionEvents.map(e => ({ id: e.id, kind: e.type, at: new Date(e.at).getTime() || 0, text: e.text, teamId: e.teamId })),
    // Bids from before bid times were recorded have no time and are left out
    ...bidHistory.filter(b => b.at).map(b => ({
      id: b.id,
      kind: 'BID',
      at: b.at,
      text: `${team(b.teamId)?.name || 'A team'} bid ${formatMoney(b.amount)} for ${playerName(b.playerId)}`,
      teamId: b.teamId
    }))
  ].sort((a, b) => b.at - a.at).slice(0, 60);

  if (items.length === 0) {
    return <EmptyState icon={Newspaper} title="No updates yet" text="Bids, sales and unsold players appear here the moment they happen." />;
  }

  return (
    <Card className="rounded-3xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bebas text-3xl text-slate-950">
        <Newspaper className="w-5 h-5 text-lime-600" /> Live updates
      </h2>
      <ol className="mt-4 divide-y divide-slate-100">
        {items.map((it, i) => {
          const [label, tone] = KINDS[it.kind] || ['Update', 'neutral'];
          const t = it.teamId ? team(it.teamId) : null;
          return (
            <li key={it.id} className={`flex items-center gap-3 py-3 ${i === 0 ? 'fp-rise' : ''}`}>
              <Badge tone={tone} className="w-28 shrink-0 justify-center">{label}</Badge>
              {t?.logo && <img src={t.logo} alt="" className="h-8 w-8 shrink-0 rounded-md bg-slate-50 object-contain ring-1 ring-slate-200" />}
              <p className="min-w-0 flex-1 text-sm font-bold text-slate-800">{it.text}</p>
              <span className="shrink-0 text-xs font-semibold text-slate-400">{ago(it.at)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
