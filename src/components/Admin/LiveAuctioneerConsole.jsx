import React, { useEffect } from 'react';
import { useAuction, HOST_VIEWS } from '../../context/AuctionContext';
import { screenUrl } from './ScreensManager';
import { PlanBanner } from './PlanLock';
import { PlayerPool } from './PlayerPool';
import { ArrowLeft, CheckCircle2, XCircle, Bot, Undo2, Tv, SkipForward, AlertCircle, Info, Youtube, Shuffle, Repeat } from 'lucide-react';
import { formatMoney } from '../../services/money';

export const LiveAuctioneerConsole = ({ onBack }) => {
  const {
    activeAuction,
    currentPlayer,
    players,
    teams,
    auctionQueue,
    bidHistory,
    nextBidAmount,
    selectPlayerForAuction,
    loadNextPlayer,
    placeBid,
    undoLastBid,
    canTeamBid,
    getTeamMaxBid,
    sellPlayer,
    markPlayerUnsold,
    autoBotBidding,
    setAutoBotBidding,
    registerController,
    notice,
    hostView,
    runSettings,
    setRunSetting,
    pickRandomPlayer,
    runLuckyDraw,
    sellToRandomTeam,
    setHostView,
    activeLock
  } = useAuction();

  // This tab drives the bot bidder
  useEffect(() => registerController(), [registerController]);

  const isLive = currentPlayer?.status === 'CURRENT';
  const highestTeam = teams.find(t => t.id === currentPlayer?.highestBidderTeamId);
  const playerBids = bidHistory.filter(b => b.playerId === currentPlayer?.id);

  const openScreen = (screen) => {
    window.open(screenUrl(screen, activeAuction.id), `fp-${screen}-${activeAuction.id}`, 'width=1400,height=900');
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Top Console Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-5 shadow-md">
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
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                AUCTIONEER CONSOLE
              </span>
              <span className="text-xs text-slate-400">Admin Control Desk</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mt-0.5">{activeAuction?.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => openScreen('host')}
            className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            title="Open the public live arena in a new window (projector / stream)"
          >
            <Tv className="w-4 h-4 text-lime-400" />
            Host Screen
          </button>

          <button
            onClick={() => openScreen('overlay')}
            className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            title="Open the YouTube / OBS overlay"
          >
            <Youtube className="w-4 h-4 text-red-400" />
            Overlay
          </button>

          <button
            onClick={() => setAutoBotBidding(!autoBotBidding)}
            className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              autoBotBidding
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Automatically simulate bidding by teams"
          >
            <Bot className="w-4 h-4" />
            {autoBotBidding ? 'Auto-Bidder Active' : 'Enable Bot Bidding'}
          </button>

        </div>
      </div>

      {activeLock.locked && <PlanBanner />}

      {/* Run settings: same-team raise, player order */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">Auction settings:</span>
        <button
          onClick={() => setRunSetting('allowSameTeamRebid', !runSettings.allowSameTeamRebid)}
          aria-pressed={runSettings.allowSameTeamRebid}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${runSettings.allowSameTeamRebid ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-500'}`}
          title="Let the leading team raise its own bid"
        >
          <Repeat className="w-3.5 h-3.5" /> Same team can raise: {runSettings.allowSameTeamRebid ? 'yes' : 'no'}
        </button>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Player order">
          {[['SEQUENTIAL', 'In order'], ['RANDOM', 'Random draw']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setRunSetting('playerOrder', id)}
              aria-pressed={runSettings.playerOrder === id}
              className={`px-3 py-1 rounded-md text-xs font-bold ${runSettings.playerOrder === id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* What the venue Host Screen is showing */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">Host screen shows:</span>
        {HOST_VIEWS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setHostView(id)}
            aria-pressed={hostView === id}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              hostView === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        {hostView === 'LUCKY_DRAW' && (
          <button
            onClick={() => runLuckyDraw(window.prompt('What is the draw for? (optional, e.g. "First pick")') || '')}
            className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300"
          >
            Run lucky draw
          </button>
        )}
      </div>

      {/* Rule / action feedback */}
      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 text-xs font-bold px-4 py-3 rounded-xl border ${
            notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-lime-50 border-lime-200 text-lime-800'
          }`}
        >
          {notice.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Player & Bid Controls */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

            {/* Player Selection */}
            <div className="flex flex-col sm:flex-row items-end justify-between gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="w-full sm:w-auto flex-1 self-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next player</span>
                <span className="text-xs font-semibold text-slate-600">
                  Load the next one, draw at random, or pick anyone from the <strong>Player Pool</strong> (search by serial no., name or category).
                </span>
              </div>

              <button
                onClick={loadNextPlayer}
                disabled={auctionQueue.filter(p => p.id !== currentPlayer?.id).length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                {runSettings.playerOrder === 'RANDOM' ? <Shuffle className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                {runSettings.playerOrder === 'RANDOM' ? 'Draw Next Player' : 'Load Next Player'} ({auctionQueue.filter(p => p.id !== currentPlayer?.id).length} left)
              </button>
              {runSettings.playerOrder !== 'RANDOM' && (
                <button
                  onClick={pickRandomPlayer}
                  disabled={auctionQueue.filter(p => p.id !== currentPlayer?.id).length === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
                  title="Draw a random player from the lowest remaining set"
                >
                  <Shuffle className="w-4 h-4 text-lime-400" /> Random Player
                </button>
              )}
            </div>

            {/* Current Player Card */}
            {currentPlayer ? (
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="w-40 h-48 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-md shrink-0">
                  <img src={currentPlayer.image} alt={currentPlayer.name} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left w-full">
                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase">
                        {currentPlayer.category}
                      </span>
                      {currentPlayer.isOverseas && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase">Overseas</span>
                      )}
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase ${
                        currentPlayer.status === 'SOLD' ? 'bg-emerald-100 text-emerald-800'
                          : currentPlayer.status === 'UNSOLD' ? 'bg-red-100 text-red-800'
                          : 'bg-lime-100 text-lime-800'
                      }`}>
                        {currentPlayer.status === 'CURRENT' ? 'ON THE FLOOR' : currentPlayer.status}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">{currentPlayer.name}</h2>
                    <p className="text-xs font-semibold text-slate-500">{currentPlayer.role} • {currentPlayer.country} • Base {formatMoney(currentPlayer.basePrice)}</p>
                  </div>

                  <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {currentPlayer.status === 'SOLD' ? 'Sold For' : 'Current High Bid'}
                      </span>
                      <span className="text-3xl font-black text-amber-400">
                        {formatMoney(currentPlayer.status === 'SOLD' ? currentPlayer.soldPrice : currentPlayer.currentBid)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {currentPlayer.status === 'SOLD' ? 'Sold To' : 'Held By'}
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {highestTeam ? `${highestTeam.name} (${highestTeam.shortCode})` : 'No Bids'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-slate-500 py-10">
                No player on the floor. Choose one above or press <strong>Load Next Player</strong>.
              </div>
            )}

            {/* Team bid buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  {isLive
                    ? `Accept ${currentPlayer.highestBidderTeamId ? 'next' : 'opening'} bid of ${formatMoney(nextBidAmount)} from:`
                    : 'Load a player to start accepting bids'}
                </h3>
                <button
                  onClick={undoLastBid}
                  disabled={!isLive || playerBids.length === 0}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo Last Bid
                </button>
              </div>

              {teams.length === 0 && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  This auction has no teams yet. Add teams in <strong>Manage Teams</strong>.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team) => {
                  const isCurrentHighest = team.id === currentPlayer?.highestBidderTeamId;
                  const check = isLive ? canTeamBid(team.id, nextBidAmount) : { ok: false };
                  const disabled = !isLive || !check.ok;
                  const canRaiseOwn = isCurrentHighest && !disabled;

                  return (
                    <button
                      key={team.id}
                      disabled={disabled}
                      onClick={() => placeBid(team.id, nextBidAmount)}
                      title={!check.ok && check.reason ? check.reason : `Bid ${formatMoney(nextBidAmount)} for ${team.name}`}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        isCurrentHighest
                          ? `bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 ${canRaiseOwn ? 'hover:bg-indigo-100' : 'cursor-not-allowed'}`
                          : disabled
                          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-indigo-600 hover:text-white border-slate-200 hover:border-indigo-600 shadow-sm group'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs group-hover:text-white text-slate-900 truncate">{team.name}</div>
                          <span className="text-[10px] font-medium text-slate-500 group-hover:text-indigo-100 block">
                            Purse {formatMoney(team.purseRemaining)} • Max bid {getTeamMaxBid(team) === Infinity ? 'no limit' : `${formatMoney(getTeamMaxBid(team))}`}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 group-hover:text-indigo-100 block">
                            Squad {team.squadCount}/{activeAuction?.maxSquadSize} • Overseas {team.overseasCount}/{activeAuction?.maxOverseas}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isCurrentHighest ? (
                          <span className="text-[10px] font-extrabold text-indigo-700 uppercase bg-indigo-100 px-2 py-1 rounded">
                            {canRaiseOwn ? `Leading · raise ${formatMoney(nextBidAmount)}` : 'Leading Bid'}
                          </span>
                        ) : !isLive ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Waiting for player</span>
                        ) : !check.ok ? (
                          <span className="text-[10px] font-bold text-red-600 uppercase">Can't bid</span>
                        ) : (
                          <span className="font-extrabold text-xs bg-slate-100 text-slate-800 group-hover:bg-white group-hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200">
                            Bid {formatMoney(nextBidAmount)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hammer Decision Buttons */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
              <button
                disabled={!isLive || !currentPlayer?.highestBidderTeamId}
                onClick={() => sellPlayer()}
                className="flex items-center justify-center gap-2 p-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                Hammer: SOLD!
              </button>

              <button
                disabled={!isLive}
                onClick={() => markPlayerUnsold()}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5" />
                Mark UNSOLD
              </button>
            </div>
            <div className="text-right -mt-2">
              <button
                disabled={!isLive || !!currentPlayer?.highestBidderTeamId}
                onClick={() => { if (window.confirm(`Give ${currentPlayer?.name} to a random team at the base price (${formatMoney(currentPlayer?.basePrice)})?`)) sellToRandomTeam(); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 underline disabled:no-underline disabled:text-slate-300"
                title="For players nobody bid on: a random team that can afford the base price gets the player"
              >
                Sold to random team (base price)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: player pool, queue stats & bid log */}
        <div className="lg:col-span-4 space-y-6">
          <PlayerPool />

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Auctioneer Queue Status</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-semibold">Total Players:</span>
                <strong className="text-slate-900">{players.length}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
                <span className="font-semibold">Sold Count:</span>
                <strong>{players.filter(p => p.status === 'SOLD').length}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-red-50 text-red-800 rounded-xl">
                <span className="font-semibold">Unsold (re-auction pool):</span>
                <strong>{players.filter(p => p.status === 'UNSOLD').length}</strong>
              </div>
              <div className="flex justify-between p-2.5 bg-blue-50 text-blue-800 rounded-xl">
                <span className="font-semibold">Remaining Upcoming:</span>
                <strong>{players.filter(p => p.status === 'UPCOMING').length}</strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Bid Log — {currentPlayer?.name || '—'}</h3>
            {playerBids.length === 0 ? (
              <p className="text-xs text-slate-500">No bids yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
                {playerBids.map((b, i) => {
                  const team = teams.find(t => t.id === b.teamId);
                  return (
                    <li key={b.id} className={`flex justify-between p-2 rounded-lg ${i === 0 ? 'bg-lime-50 font-bold' : 'bg-slate-50'}`}>
                      <span>{team?.shortCode || '?'} • {b.time}</span>
                      <span>{formatMoney(b.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
