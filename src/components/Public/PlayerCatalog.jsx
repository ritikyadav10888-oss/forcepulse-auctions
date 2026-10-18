import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { ArrowLeft, Search, Filter, Trophy, UserCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatMoney } from '../../services/money';

export const PlayerCatalog = ({ onBack }) => {
  const { players, teams, activeAuction } = useAuction();
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SOLD', 'UNSOLD', 'UPCOMING'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'Batsman', 'Bowler', etc.
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['ALL', ...(activeAuction?.categories || ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'])];
  const statuses = [
    { id: 'ALL', label: 'All Players', icon: Trophy, count: players.length },
    { id: 'SOLD', label: 'Sold Players', icon: CheckCircle2, count: players.filter(p => p.status === 'SOLD').length },
    { id: 'UNSOLD', label: 'Unsold Players', icon: XCircle, count: players.filter(p => p.status === 'UNSOLD').length },
    { id: 'UPCOMING', label: 'Upcoming Players', icon: Clock, count: players.filter(p => p.status === 'UPCOMING' || p.status === 'CURRENT').length }
  ];

  // Filtering Logic: Strict Category + Status match
  const filteredPlayers = players.filter((player) => {
    // Status check
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'UPCOMING' ? (player.status === 'UPCOMING' || player.status === 'CURRENT') : player.status === statusFilter);

    // Category check (Strict case-insensitive match)
    const matchesCategory =
      categoryFilter === 'ALL' ||
      player.category.toLowerCase() === categoryFilter.toLowerCase();

    // Search term check
    const matchesSearch =
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.country.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

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
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Auction Players Directory</h1>
            <p className="text-xs text-slate-500 font-medium">Filter players by status (Sold, Unsold, Upcoming) and category</p>
          </div>
        </div>
      </div>

      {/* Main Status Tabs (ALL, SOLD, UNSOLD, UPCOMING) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statuses.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                <span className="font-extrabold text-xs">{tab.label}</span>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Pills & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600" /> Category:
            </span>
            {categories.map((cat) => {
              const countInCat = players.filter(p => {
                const matchesSt = statusFilter === 'ALL' || (statusFilter === 'UPCOMING' ? (p.status === 'UPCOMING' || p.status === 'CURRENT') : p.status === statusFilter);
                const matchesCat = cat === 'ALL' || p.category.toLowerCase() === cat.toLowerCase();
                return matchesSt && matchesCat;
              }).length;

              const isCatSelected = categoryFilter === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isCatSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isCatSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {countInCat}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${categoryFilter !== 'ALL' ? categoryFilter : ''} players...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>
      </div>

      {/* Grid of Players */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs italic">
          No players found matching status <strong>"{statusFilter}"</strong> and category <strong>"{categoryFilter}"</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => {
            const soldTeam = teams.find(t => t.id === player.soldToTeamId);
            return (
              <div
                key={player.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-right">
                      {player.status === 'SOLD' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase block">
                          SOLD
                        </span>
                      ) : player.status === 'UNSOLD' ? (
                        <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase block">
                          UNSOLD
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase block">
                          UPCOMING
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">Set #{player.setNo}</span>
                    </div>
                  </div>

                  <div>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase">
                      {player.category}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1">{player.name}</h3>
                    <p className="text-xs font-semibold text-slate-500">{player.role} • {player.country}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Base Price</span>
                    <span className="font-extrabold text-slate-900">{formatMoney(player.basePrice)}</span>
                  </div>

                  <div className="text-right">
                    {player.status === 'SOLD' ? (
                      <>
                        <span className="text-slate-400 font-medium block">Sold To</span>
                        <span className="font-black text-emerald-600">{formatMoney(player.soldPrice)} ({soldTeam?.shortCode || 'Team'})</span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 font-medium block">Status</span>
                        <span className="font-bold text-slate-700">{player.status}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
