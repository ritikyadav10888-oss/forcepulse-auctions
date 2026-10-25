import React from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Users } from 'lucide-react';
import { formatMoney } from '../../services/money';
import { EmptyState } from '../ui';

// Public "Teams" board (light, like the rest of the public pages): a chip per team to jump to it,
// then every team's purse and the players it bought
export const TeamsBoard = () => {
  const { teams, players, activeAuction } = useAuction();
  const maxSquad = activeAuction?.maxSquadSize || 0;
  if (teams.length === 0) return <EmptyState icon={Users} title="No teams yet" text="Teams will appear here once the organiser adds them." />;

  const jump = (id) => document.getElementById(`team-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="space-y-4" aria-label="Teams">

      {/* Team chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="navigation" aria-label="Jump to team">
        {teams.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => jump(t.id)}
            title={t.name}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-bebas text-lg leading-none tracking-wide text-slate-800 ring-1 ring-slate-200 shadow-sm hover:bg-slate-950 hover:text-lime-400 hover:ring-slate-950 transition-colors"
          >
            {t.shortCode || t.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
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
    ['Total purse', formatMoney(total), 'text-sky-600'],
    ['Used', formatMoney(used), 'text-red-600'],
    ['Balance', formatMoney(total - used), 'text-emerald-600'],
    ['Players', `${squad.length}/${maxSquad || '–'}`, 'text-slate-950']
  ];

  return (
    <article id={`team-${team.id}`} className="scroll-mt-32 rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm sm:p-6">
      <header className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <img src={team.logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain ring-1 ring-slate-200 shadow-sm sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <h3 className="truncate font-bebas text-3xl leading-none text-slate-950 sm:text-4xl">{team.name}</h3>
          {(team.owner || team.coach) && (
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{[team.owner && `Owner ${team.owner}`, team.coach && `Coach ${team.coach}`].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-2 py-3 text-center ring-1 ring-slate-200">
            <div className={`whitespace-nowrap font-bebas text-xl leading-none sm:text-2xl xl:text-[1.7rem] ${tone}`}>{value}</div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {squad.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">No players bought yet.</p>
      ) : (
        <ol className="mt-4 max-h-[26rem] divide-y divide-slate-100 overflow-y-auto pr-1">
          {squad.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">{i + 1}</span>
              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover object-top bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-bold leading-tight text-slate-950">{p.name}</div>
                <div className="truncate text-xs font-semibold text-slate-500">{p.role || p.category}</div>
              </div>
              {p.previousTeam && <span className="hidden max-w-[8rem] truncate text-sm font-bold uppercase text-slate-500 sm:block">{p.previousTeam}</span>}
              <span className="shrink-0 rounded-full bg-lime-500 px-3.5 py-1 font-bebas text-xl leading-none text-slate-950">
                {formatMoney(p.soldPrice)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
};
