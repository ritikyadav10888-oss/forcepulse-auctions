import React from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Users } from 'lucide-react';
import { formatMoney } from '../../services/money';
import { EmptyState, Stripes } from '../ui';

// Public "Teams" board: a chip per team to jump to it, then every team's purse and the players it bought
export const TeamsBoard = () => {
  const { teams, players, activeAuction } = useAuction();
  const maxSquad = activeAuction?.maxSquadSize || 0;
  if (teams.length === 0) return <EmptyState icon={Users} title="No teams yet" text="Teams will appear here once the organiser adds them." />;

  const jump = (id) => document.getElementById(`team-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-4 text-white sm:p-6" aria-label="Teams">
      <Stripes />
      <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Team chips */}
      <div className="relative flex gap-2 overflow-x-auto pb-2 fp-scroll" role="navigation" aria-label="Jump to team">
        {teams.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => jump(t.id)}
            title={t.name}
            className="shrink-0 rounded-lg border border-lime-500/60 bg-lime-500/10 px-3 py-1.5 font-bebas text-lg leading-none tracking-wide text-lime-300 hover:bg-lime-500 hover:text-slate-950 transition-colors"
          >
            {t.shortCode || t.name}
          </button>
        ))}
      </div>

      <div className="relative mt-4 grid gap-5 lg:grid-cols-2">
        {teams.map(t => <TeamCard key={t.id} team={t} players={players} maxSquad={maxSquad} />)}
      </div>
    </section>
  );
};

const TeamCard = ({ team, players, maxSquad }) => {
  const squad = players
    .filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id)
    .sort((a, b) => Number(b.soldPrice || 0) - Number(a.soldPrice || 0));
  const total = Number(team.initialPurse || 0);
  const used = squad.reduce((s, p) => s + Number(p.soldPrice || 0), 0);
  const stats = [
    ['Total purse', formatMoney(total), 'text-sky-400'],
    ['Used', formatMoney(used), 'text-red-400'],
    ['Balance', formatMoney(total - used), 'text-emerald-400'],
    ['Players', `${squad.length}/${maxSquad || '–'}`, 'text-white']
  ];

  return (
    <article id={`team-${team.id}`} className="scroll-mt-32 rounded-3xl bg-slate-900/85 p-5 ring-1 ring-white/10 backdrop-blur sm:p-6">
      <header className="flex items-center gap-4 border-b border-white/10 pb-4">
        <img src={team.logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white/5 object-contain ring-2 ring-white/80 sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <h3 className="truncate font-bebas text-3xl leading-none sm:text-4xl">{team.name}</h3>
          {(team.owner || team.coach) && (
            <p className="mt-1 truncate text-xs font-semibold text-slate-400">{[team.owner && `Owner ${team.owner}`, team.coach && `Coach ${team.coach}`].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-xl bg-slate-800/70 px-2 py-3 text-center ring-1 ring-white/5">
            <div className={`whitespace-nowrap font-bebas text-xl leading-none sm:text-2xl xl:text-[1.7rem] ${tone}`}>{value}</div>
            <div className="mt-1 font-bebas text-sm tracking-wide text-slate-400 sm:text-base">{label}</div>
          </div>
        ))}
      </div>

      {squad.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 py-8 text-center text-sm font-semibold text-slate-400">No players bought yet.</p>
      ) : (
        <ol className="mt-4 max-h-[26rem] divide-y divide-white/10 overflow-y-auto pr-1 fp-scroll">
          {squad.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">{i + 1}</span>
              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover object-top bg-slate-700" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-bold leading-tight">{p.name}</div>
                <div className="truncate text-xs font-semibold text-slate-400">{p.role || p.category}</div>
              </div>
              {p.previousTeam && <span className="hidden max-w-[8rem] truncate text-sm font-bold uppercase text-slate-400 sm:block">{p.previousTeam}</span>}
              <span className="shrink-0 rounded-full bg-gradient-to-r from-lime-600 to-lime-400 px-3.5 py-1 font-bebas text-xl leading-none text-slate-950 shadow-md shadow-lime-500/20">
                {formatMoney(p.soldPrice)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
};
