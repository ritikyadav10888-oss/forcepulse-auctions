import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { ArrowLeft, Radio, Trophy, Users, Shield, Clock, TrendingUp, Sparkles, Volume2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { formatMoney, moneyParts } from '../../services/money';

export const LiveAuctionViewer = ({ onBack }) => {
  const { activeAuction, currentPlayer, teams, players, bidHistory } = useAuction();
  const [activeTab, setActiveTab] = useState('TEAMS'); // 'TEAMS', 'UPCOMING', 'SOLD', 'UNSOLD'
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!currentPlayer) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
        <Radio className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="font-bold text-slate-700 text-lg">Auction Arena Standing By</h3>
        <p className="text-xs text-slate-500 mt-1">No active player currently undergoing bidding.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
          >
            Back to Hub
          </button>
        )}
      </div>
    );
  }

  const highestTeam = teams.find(t => t.id === currentPlayer.highestBidderTeamId);
  const playerBids = bidHistory.filter(b => !b.playerId || b.playerId === currentPlayer.id);

  // Filtered lists for tabs
  const soldPlayers = players.filter(p => p.status === 'SOLD');
  const unsoldPlayers = players.filter(p => p.status === 'UNSOLD');
  const upcomingPlayers = players.filter(p => p.status === 'UPCOMING' || p.status === 'CURRENT');

  // Filtered teams list
  const displayTeams = selectedTeamFilter === 'ALL'
    ? teams
    : teams.filter(t => t.id === selectedTeamFilter || t.shortCode === selectedTeamFilter);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Tournament Header Banner (TPA Dark Blue Header) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border-b-4 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors border border-slate-700"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-lime-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                AUCTION LIVE
              </span>
              <span className="text-xs font-semibold text-slate-400">|</span>
              <span className="text-xs font-bold text-slate-300 uppercase">{activeAuction?.sport}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight font-bebas text-white mt-0.5">
              {activeAuction?.title}
            </h1>
          </div>
        </div>

      </div>

      {/* Main Arena Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Player Spotlight Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            
            {/* Status Overlay Banner if Sold / Unsold */}
            {currentPlayer.status === 'SOLD' && (
              <div className="mb-6 bg-lime-500/10 border border-lime-500/40 text-lime-400 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-lime-400 shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-lg">PLAYER SOLD!</h3>
                    <p className="text-xs text-slate-300">
                      Acquired by <strong>{highestTeam?.name || 'Winning Team'}</strong> for <strong>{formatMoney(currentPlayer.soldPrice)}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-black text-lime-400">{formatMoney(currentPlayer.soldPrice)}</div>
              </div>
            )}

            {currentPlayer.status === 'UNSOLD' && (
              <div className="mb-6 bg-red-500/10 border border-red-500/40 text-red-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-lg">PLAYER UNSOLD</h3>
                  <p className="text-xs text-slate-300">No bids received at base price of {formatMoney(currentPlayer.basePrice)}.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              
              {/* Player Image */}
              <div className="relative shrink-0">
                <div className="w-44 h-52 sm:w-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-md">
                  <img
                    src={currentPlayer.image}
                    alt={currentPlayer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md text-slate-200 text-[10px] font-bold py-1 px-2 rounded-lg text-center truncate">
                  Set #{currentPlayer.setNo} • {currentPlayer.country}
                </span>
              </div>

              {/* Player Details & Real-Time Bid Details Box */}
              <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="bg-orange-500 text-slate-950 text-xs font-black px-3 py-0.5 rounded-full uppercase">
                      {currentPlayer.category}
                    </span>
                    {currentPlayer.isOverseas && (
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        ✈ Overseas
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-white mt-2">
                    {currentPlayer.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {currentPlayer.role}
                  </p>
                </div>

                {/* Key Stats Bar */}
                <div className="grid grid-cols-3 gap-2 bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Matches</span>
                    <span className="text-sm font-black text-white">{currentPlayer.stats?.matches || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {currentPlayer.category === 'Bowler' ? 'Wickets' : 'Runs'}
                    </span>
                    <span className="text-sm font-black text-white">
                      {currentPlayer.stats?.wickets || currentPlayer.stats?.runs || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {currentPlayer.category === 'Bowler' ? 'Economy' : 'Strike Rate'}
                    </span>
                    <span className="text-sm font-black text-white">
                      {currentPlayer.stats?.economy || currentPlayer.stats?.strikeRate || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* TPA BID DETAILS Box */}
                <div className="bg-slate-950 border border-lime-500/50 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                    <div>
                      <span className="text-xs font-bold text-lime-400 uppercase tracking-wider block">
                        BASE PRICE: {formatMoney(currentPlayer.basePrice)}
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-lime-400 tracking-tight animate-bid-pop mt-0.5 font-mono">
                        {moneyParts(currentPlayer.currentBid).value} <span className="text-lg font-bold text-white">{moneyParts(currentPlayer.currentBid).unit === 'Cr' ? 'Crore' : 'Lakh'}</span>
                      </div>
                    </div>

                    <div className="text-center sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Highest Bidding Team</span>
                      {highestTeam ? (
                        <div className="inline-flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 mt-1">
                          <img src={highestTeam.logo} alt={highestTeam.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-black text-sm text-white">{highestTeam.name} ({highestTeam.shortCode})</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic block mt-1">Awaiting Opening Bid</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Live Bid Ticker Stream (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lime-600" />
              Live Bid Ticker Stream
            </h3>

            {playerBids.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No bids placed yet for this player.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {playerBids.map((item, index) => {
                  const bTeam = teams.find(t => t.id === item.teamId);
                  return (
                    <div
                      key={item.id || index}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs font-semibold border transition-all ${
                        index === 0
                          ? 'bg-lime-50 border-lime-300 text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                        {bTeam && (
                          <div className="flex items-center gap-2">
                            <img src={bTeam.logo} alt={bTeam.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="font-bold text-slate-800">{bTeam.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="font-extrabold text-lime-700 text-sm">
                        {formatMoney(item.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Sub-Navigation Tabs matching TPA (`TEAMS`, `UPCOMING PLAYERS`, `SOLD PLAYERS`, `UNSOLD PLAYERS`) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              activeTab === 'TEAMS'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            TEAMS ({teams.length})
          </button>

          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              activeTab === 'UPCOMING'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            UPCOMING PLAYERS ({upcomingPlayers.length})
          </button>

          <button
            onClick={() => setActiveTab('SOLD')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              activeTab === 'SOLD'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            SOLD PLAYERS ({soldPlayers.length})
          </button>

          <button
            onClick={() => setActiveTab('UNSOLD')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              activeTab === 'UNSOLD'
                ? 'bg-lime-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            UNSOLD PLAYERS ({unsoldPlayers.length})
          </button>
        </div>

        {/* Team Quick Jump Pill Filter */}
        {activeTab === 'TEAMS' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase shrink-0">Filter Team:</span>
            <button
              onClick={() => setSelectedTeamFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all shrink-0 ${
                selectedTeamFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ALL
            </button>
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamFilter(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedTeamFilter === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <img src={t.logo} alt={t.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                <span>{t.shortCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TEAMS VIEW: 4 Purse Metrics per Team matching TPA (`TOTAL PURSE`, `USED`, `BALANCE`, `PLAYERS`) */}
      {activeTab === 'TEAMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
          {displayTeams.map((team) => {
            const totalPurse = team.initialPurse || 100;
            const remainingPurse = team.purseRemaining;
            const usedPurse = Number((totalPurse - remainingPurse).toFixed(2));
            const squad = players.filter(p => p.soldToTeamId === team.id);

            return (
              <div
                key={team.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                {/* Team Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{team.name} ({team.shortCode})</h3>
                      <span className="text-xs text-slate-500 font-semibold">Coach: {team.coach}</span>
                    </div>
                  </div>
                </div>

                {/* TPA 4-Box Purse Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL PURSE</span>
                    <span className="text-sm font-black text-slate-900">{formatMoney(totalPurse)}</span>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider block">USED</span>
                    <span className="text-sm font-black text-red-600">{formatMoney(usedPurse)}</span>
                  </div>

                  <div className="bg-lime-50 border border-lime-300 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-lime-800 uppercase tracking-wider block">BALANCE</span>
                    <span className="text-sm font-black text-lime-700">{formatMoney(remainingPurse)}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">PLAYERS</span>
                    <span className="text-sm font-black text-indigo-600">{squad.length} / {activeAuction?.maxSquadSize || 25}</span>
                  </div>
                </div>

                {/* Squad Table */}
                {squad.length === 0 ? (
                  <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">
                    No players acquired yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Player Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 text-right">Sold Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {squad.map((player, idx) => (
                          <tr key={player.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <img src={player.image} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
                              <span>{player.name}</span>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                                {player.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{player.role}</td>
                            <td className="p-3 text-right font-black text-lime-700">
                              {formatMoney(player.soldPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* PLAYERS LIST VIEW (UPCOMING / SOLD / UNSOLD) */}
      {activeTab !== 'TEAMS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base uppercase">
            {activeTab} PLAYERS LIST
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {(activeTab === 'SOLD' ? soldPlayers : activeTab === 'UNSOLD' ? unsoldPlayers : upcomingPlayers).map((player) => {
              const soldTeam = teams.find(t => t.id === player.soldToTeamId);
              return (
                <div key={player.id} className="border border-slate-200 rounded-2xl p-4 flex items-center gap-3 bg-slate-50">
                  <img src={player.image} alt={player.name} className="w-12 h-14 rounded-xl object-cover border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <span className="bg-orange-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                      {player.category}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm truncate mt-0.5">{player.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{player.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold block">Base: {formatMoney(player.basePrice)}</span>
                    {player.status === 'SOLD' ? (
                      <span className="text-xs font-black text-lime-700">{formatMoney(player.soldPrice)} ({soldTeam?.shortCode})</span>
                    ) : (
                      <span className="text-xs font-bold text-slate-700">{player.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
