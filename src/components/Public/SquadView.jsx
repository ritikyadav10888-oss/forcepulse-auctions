import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { ArrowLeft, Users, Shield, Trophy, DollarSign, Search, Filter } from 'lucide-react';
import { formatMoney } from '../../services/money';

export const SquadView = ({ onBack }) => {
  const { teams, players, activeAuction } = useAuction();
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const squadPlayers = players.filter(p => p.soldToTeamId === currentTeam?.id);

  // Available categories in the auction
  const categories = ['ALL', ...(activeAuction?.categories || ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'])];

  // Filter squad players by category and search term
  const filteredSquad = squadPlayers.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.country.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalSpent = Number(((currentTeam?.initialPurse || 100) - (currentTeam?.purseRemaining || 0)).toFixed(2));
  const overseasCount = squadPlayers.filter(p => p.isOverseas).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Team Squad Rosters</h1>
            <p className="text-xs text-slate-500 font-medium">Inspect official squads, category breakdowns, and purse utilization</p>
          </div>
        </div>
      </div>

      {/* Team Selection Tabs */}
      {teams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
          No teams registered for this auction yet.
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTeamId(t.id);
                setSelectedCategory('ALL');
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold shrink-0 transition-all ${
                (currentTeam?.id === t.id)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <img src={t.logo} alt={t.name} className="w-5 h-5 rounded-full object-cover" />
              <span>{t.name}</span>
              <span className="bg-white/20 text-current px-1.5 py-0.5 rounded text-[10px]">
                {players.filter(p => p.soldToTeamId === t.id).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Team Summary Card & Roster */}
      {currentTeam && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <img src={currentTeam.logo} alt={currentTeam.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
              <div>
                <h2 className="text-2xl font-black text-slate-900">{currentTeam.name} ({currentTeam.shortCode})</h2>
                <p className="text-xs font-semibold text-slate-500">Coach: {currentTeam.coach} • Owner: {currentTeam.owner}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl min-w-24">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining Purse</span>
                <span className="text-base font-black text-emerald-600">{formatMoney(currentTeam.purseRemaining)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl min-w-24">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Spent</span>
                <span className="text-base font-black text-slate-900">{formatMoney(totalSpent)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl min-w-24">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Squad</span>
                <span className="text-base font-black text-indigo-600">{squadPlayers.length} ({overseasCount} ✈)</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills & Search Bar */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" /> Category:
                </span>
                {categories.map((cat) => {
                  const categoryCount = cat === 'ALL'
                    ? squadPlayers.length
                    : squadPlayers.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {categoryCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedCategory !== 'ALL' ? selectedCategory : ''} players...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>
          </div>

          {/* Players Roster Table */}
          {filteredSquad.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {squadPlayers.length === 0
                ? `No players bought by ${currentTeam.name} yet.`
                : `No ${selectedCategory} players bought by ${currentTeam.name}.`}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Player</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5 text-right">Sold Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredSquad.map((player) => (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img src={player.image} alt={player.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                        <div>
                          <span className="font-bold text-slate-900 block">{player.name}</span>
                          <span className="text-[10px] text-slate-400">Set #{player.setNo}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold">
                          {player.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{player.role}</td>
                      <td className="p-3.5">
                        {player.country} {player.isOverseas && <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">✈ Overseas</span>}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-600 text-sm">
                        {formatMoney(player.soldPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
