import React, { useState } from 'react';
import { useSessionState } from '../../hooks/useSessionState';
import { useAuction, isPublicAuction, suggestedBasePrice } from '../../context/AuctionContext';
import { screenUrl } from '../Admin/ScreensManager';
import { ArrowLeft, Shield, UserPlus, Radio, Layers, Monitor, Plus, Edit2, Trash2, Download, FileSpreadsheet, FileText, Lock, SlidersHorizontal, User, Calendar, ClipboardList } from 'lucide-react';
import { TeamManager } from '../Admin/TeamManager';
import { PlayerManager } from '../Admin/PlayerManager';
import { CreateCategoryModal } from '../Admin/CreateCategoryModal';
import { ScreensManager } from '../Admin/ScreensManager';
import { PlanBanner } from '../Admin/PlanLock';
import { AuctionForm } from './AuctionForm';
import { RegistrationsManager } from '../Admin/RegistrationsManager';
import { formatMoney } from '../../services/money';
import { downloadSquadsExcel, printSquadsPdf } from '../../services/squadExport';
import { Button, Stripes, Tabs } from '../ui';

const TABS = [
  ['TEAMS', 'Teams', Shield],
  ['PLAYERS', 'Players', UserPlus],
  ['REGISTRATIONS', 'Player Registration', ClipboardList],
  ['CATEGORIES', 'Categories', Layers],
  ['SETTINGS', 'Settings', SlidersHorizontal],
  ['SCREENS', 'Screens & Overlay', Monitor]
];

// One auction's setup and run room, used by both the organiser dashboard and the Force Pulse admin panel
export const AuctionWorkspace = ({ onBack, backLabel = 'All auctions', initialTab = 'TEAMS' }) => {
  const { activeAuction, editAuction, teams, players, activeLock, canSetup, canEditPlayers, deleteCategory, fillCategoryPrices, isSuperAdmin, users } = useAuction();
  const [activeTab, setActiveTab] = useSessionState(`fp:ws:tab:${activeAuction?.id}`, initialTab);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  if (!activeAuction) return null;

  const handleExportData = () => {
    const rows = [['Set', 'Player Name', 'Category', 'Base Price', 'Sold Price', 'Status', 'Team']]
      .concat(players.map(p => [p.setNo, p.name, p.category, p.basePrice, p.soldPrice || 0, p.status, teams.find(t => t.id === p.soldToTeamId)?.name || '']));
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeAuction.title}_Players.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const categoriesList = activeAuction.categories || ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
  const owner = users.find(u => u.email === activeAuction.ownerEmail);

  return (
    <div className="space-y-6 pb-16">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Auction header */}
      <div className="relative rounded-2xl bg-slate-950 text-white shadow-xl overflow-hidden">
        <Stripes />
        <div className="relative p-5 sm:p-7 space-y-5">
          {/* Badges · title · meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lime-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">
                {isSuperAdmin ? 'Force Pulse setup' : 'My auction'}
              </span>
              <span className="rounded-full border border-lime-400/40 bg-lime-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-lime-300">
                {activeLock.plan.name}
              </span>
              {!canSetup && (
                <span className="rounded-full bg-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">Managed by Force Pulse</span>
              )}
              {activeLock.locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950"><Lock className="w-3 h-3" /> Locked</span>
              )}
            </div>
            <h1 className="font-bebas text-4xl sm:text-5xl leading-[0.95]">{activeAuction.title}</h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-400">
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{owner ? `${owner.name} · ${owner.email}` : activeAuction.ownerEmail || 'Unassigned'}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {Number.isNaN(new Date(activeAuction.startDate).getTime()) ? 'Date to be announced' : new Date(activeAuction.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div role="radiogroup" aria-label="Auction status" className="grid grid-cols-3 rounded-2xl bg-slate-800 p-1 lg:w-auto">
              {[['UPCOMING', 'Upcoming'], ['LIVE', 'Live'], ['PAST', 'Completed']].map(([id, label]) => {
                const on = activeAuction.status === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => editAuction(activeAuction.id, { status: id })}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      on ? (id === 'LIVE' ? 'bg-red-600 text-white' : 'bg-white text-slate-900') : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {id === 'LIVE' && <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-white animate-pulse' : 'bg-red-500'}`} />}
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 lg:ml-auto">
              <Button size="lg" onClick={() => window.open(screenUrl('live-screen', activeAuction.id), `fp-live-${activeAuction.id}`)} disabled={activeLock.locked} title={activeLock.locked ? 'Locked: contact Force Pulse to unlock this auction' : 'Opens the Live Screen: the big screen with the bidding bar'}>
                {activeLock.locked ? <Lock className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                Start bidding (Live Screen)
              </Button>
              <Button variant="ghostDark" onClick={handleExportData}>
                <Download className="w-4 h-4 text-lime-400" /> Export list
              </Button>
              <Button variant="ghostDark" onClick={() => downloadSquadsExcel(activeAuction, teams, players)} title="Each team with the players it bought, as an Excel file">
                <FileSpreadsheet className="w-4 h-4 text-lime-400" /> Team squads (Excel)
              </Button>
              <Button variant="ghostDark" onClick={() => printSquadsPdf(activeAuction, teams, players) || window.alert('Allow pop-ups for this site, then try again to save the PDF.')} title="Opens a print page: choose Save as PDF">
                <FileText className="w-4 h-4 text-lime-400" /> Team squads (PDF)
              </Button>
            </div>
          </div>
        </div>

        {/* Key numbers */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800 bg-slate-900/60">
          {[
            ['Purse / team', `${formatMoney(activeAuction.purseLimit)}`],
            ['Squad size', `${activeAuction.minSquadSize}–${activeAuction.maxSquadSize}`],
            ['Teams', `${teams.length} / ${activeLock.teamLimit}`, Math.min(1, teams.length / activeLock.teamLimit)],
            ['Players', players.length]
          ].map(([label, value, fill], i) => (
            <div key={label} className={`p-4 sm:px-6 space-y-1 ${i % 2 === 1 ? 'border-l border-slate-800' : ''} ${i >= 2 ? 'border-t lg:border-t-0 border-slate-800' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
              <div className={`text-lg font-black ${label === 'Teams' && activeLock.locked ? 'text-amber-400' : ''}`}>{value}</div>
              {fill !== undefined && (
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
                  <div className={`h-full rounded-full ${activeLock.locked ? 'bg-amber-400' : 'bg-lime-400'}`} style={{ width: `${fill * 100}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isPublicAuction(activeAuction) && (
        <div role="status" className="rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-medium text-red-600 shadow-sm">
          This auction is not verified yet, so its public page is switched off. Contact the Force Pulse team to verify the auction and enable the public page.
        </div>
      )}

      <PlanBanner />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={TABS.map(([id, label, Icon]) => ({ id, label, icon: Icon, count: id === 'TEAMS' ? teams.length : id === 'PLAYERS' ? players.length : undefined }))}
      />

      {activeTab === 'TEAMS' && <TeamManager />}
      {activeTab === 'PLAYERS' && <PlayerManager />}
      {activeTab === 'REGISTRATIONS' && <RegistrationsManager key={activeAuction.id} />}
      {activeTab === 'SETTINGS' && <AuctionForm key={activeAuction.id} mode="edit" embedded />}
      {activeTab === 'SCREENS' && <ScreensManager />}

      {activeTab === 'CATEGORIES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Player Categories</h2>
              <p className="text-xs text-slate-500 font-medium">Categories group players in the catalogue, screens and squads</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            {canEditPlayers && categoriesList.some(c => !(Number(activeAuction.categoryPrices?.[c]) > 0)) && (
              <button
                onClick={fillCategoryPrices}
                title="Purse ÷ squad size ÷ 5, to the nearest lakh"
                className="flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Set missing prices automatically ({formatMoney(suggestedBasePrice(activeAuction))} each)
              </button>
            )}
            {canEditPlayers && (
              <button
                onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                className="flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Category
              </button>
            )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr><th className="p-3.5">#</th><th className="p-3.5">Category</th><th className="p-3.5">Players</th><th className="p-3.5">Base price</th><th className="p-3.5">Players' prices</th><th className="p-3.5">Sold</th><th className="p-3.5 text-right" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {categoriesList.map((catName, idx) => {
                  const inCat = players.filter(p => p.category === catName);
                  const prices = inCat.map(p => Number(p.basePrice));
                  return (
                    <tr key={catName} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">{catName}</td>
                      <td className="p-3.5">{inCat.length}</td>
                      <td className="p-3.5 font-bold text-slate-900">{activeAuction.categoryPrices?.[catName] ? formatMoney(activeAuction.categoryPrices[catName]) : <span className="font-medium text-slate-400">Not set</span>}</td>
                      <td className="p-3.5">{prices.length ? `${formatMoney(Math.min(...prices))} – ${formatMoney(Math.max(...prices))}` : '—'}</td>
                      <td className="p-3.5">{inCat.filter(p => p.status === 'SOLD').length}</td>
                      <td className="p-3.5 text-right">
                        {canEditPlayers && (
                          <span className="inline-flex gap-1">
                            <button onClick={() => { setEditingCategory({ name: catName, basePrice: activeAuction.categoryPrices?.[catName] ?? '' }); setShowCategoryModal(true); }} className="p-1 text-slate-400 hover:text-slate-900" aria-label={`Rename ${catName}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (window.confirm(`Delete the ${catName} category?`)) deleteCategory(catName); }} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${catName}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCategoryModal && <CreateCategoryModal onClose={() => setShowCategoryModal(false)} categoryToEdit={editingCategory} />}
    </div>
  );
};
