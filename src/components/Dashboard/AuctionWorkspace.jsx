import React, { useEffect, useState } from 'react';
import { useAuction, isPublicAuction } from '../../context/AuctionContext';
import { FORCE_PULSE_CONTACT } from '../../config/forcePulse';
import { screenUrl } from '../Admin/ScreensManager';
import { shortId } from './AuctionsList';
import { ArrowLeft, Shield, UserPlus, Radio, Layers, Monitor, Plus, Edit2, Download, Lock, SlidersHorizontal, User, Calendar, ClipboardList } from 'lucide-react';
import { LiveAuctioneerConsole } from '../Admin/LiveAuctioneerConsole';
import { TeamManager } from '../Admin/TeamManager';
import { PlayerManager } from '../Admin/PlayerManager';
import { CreateCategoryModal } from '../Admin/CreateCategoryModal';
import { ScreensManager } from '../Admin/ScreensManager';
import { PlanBanner } from '../Admin/PlanLock';
import { AuctionForm } from './AuctionForm';
import { RegistrationsManager } from '../Admin/RegistrationsManager';
import { formatMoney } from '../../services/money';

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
  const { activeAuction, editAuction, teams, players, activeLock, canSetup, isSuperAdmin, users } = useAuction();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // A locked auction can't run the console
  useEffect(() => {
    if (activeLock.locked && activeTab === 'CONSOLE') setActiveTab('TEAMS');
  }, [activeLock.locked, activeTab]);

  if (!activeAuction) return null;

  if (activeTab === 'CONSOLE') {
    return <LiveAuctioneerConsole onBack={() => setActiveTab('TEAMS')} />;
  }

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
      <div className="rounded-3xl bg-slate-900 text-white shadow-xl overflow-hidden">
        <div className="p-5 sm:p-7 space-y-5">
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
            <h1 className="font-bebas text-3xl sm:text-4xl leading-tight tracking-wide">{activeAuction.title}</h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-400">
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{owner ? `${owner.name} · ${owner.email}` : activeAuction.ownerEmail || 'Unassigned'}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {new Date(activeAuction.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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
              <button
                onClick={() => window.open(screenUrl('live-screen', activeAuction.id), `fp-live-${activeAuction.id}`)}
                disabled={activeLock.locked}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:bg-slate-700 disabled:text-slate-400"
              >
                <Monitor className="w-4 h-4" />
                Live Screen
              </button>
              <button
                onClick={() => setActiveTab('CONSOLE')}
                disabled={activeLock.locked}
                title={activeLock.locked ? 'Locked: contact Force Pulse to unlock this auction' : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-500 hover:bg-lime-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-500/20 transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {activeLock.locked ? <Lock className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                Launch Live Auction Console
              </button>
              <button
                onClick={handleExportData}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-bold"
              >
                <Download className="w-4 h-4 text-lime-400" />
                Export List
              </button>
            </div>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800 bg-slate-950/40">
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

      {/* Help box: the Auction ID is what Force Pulse asks for */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2 text-sm text-slate-700">
        <p>
          Need help with bulk data entry, your plan, auction settings or using the software? Contact the Force Pulse team. We're happy to help.
        </p>
        <p className="text-base">
          <strong className="underline">Auction Id : {shortId(activeAuction.id)}</strong>{' '}
          <span className="text-slate-500">(our team will ask for this id for a faster resolution)</span>
        </p>
        {(FORCE_PULSE_CONTACT.phone || FORCE_PULSE_CONTACT.whatsapp || FORCE_PULSE_CONTACT.email) && (
          <p>
            Call or WhatsApp:{' '}
            {FORCE_PULSE_CONTACT.phone && <a href={`tel:${FORCE_PULSE_CONTACT.phone}`} className="font-black text-lime-700">{FORCE_PULSE_CONTACT.phone}</a>}
            {FORCE_PULSE_CONTACT.whatsapp && <> · <a href={`https://wa.me/${FORCE_PULSE_CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="font-black text-lime-700">WhatsApp</a></>}
            {FORCE_PULSE_CONTACT.email && <> · <a href={`mailto:${FORCE_PULSE_CONTACT.email}`} className="font-black text-lime-700">{FORCE_PULSE_CONTACT.email}</a></>}
          </p>
        )}
      </div>

      {!isPublicAuction(activeAuction) && (
        <div role="status" className="rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-medium text-red-600 shadow-sm">
          This auction is not verified yet, so its public page is switched off. Contact the Force Pulse team to verify the auction and enable the public page.
        </div>
      )}

      <PlanBanner />

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
              activeTab === id ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5 text-lime-500" />
            {label}
            {id === 'TEAMS' && ` (${teams.length})`}
            {id === 'PLAYERS' && ` (${players.length})`}
          </button>
        ))}
      </div>

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
            {canSetup && (
              <button
                onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                className="flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Category
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr><th className="p-3.5">#</th><th className="p-3.5">Category</th><th className="p-3.5">Players</th><th className="p-3.5">Base price range</th><th className="p-3.5">Sold</th><th className="p-3.5 text-right" /></tr>
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
                      <td className="p-3.5">{prices.length ? `${formatMoney(Math.min(...prices))} – ${formatMoney(Math.max(...prices))}` : '—'}</td>
                      <td className="p-3.5">{inCat.filter(p => p.status === 'SOLD').length}</td>
                      <td className="p-3.5 text-right">
                        {canSetup && (
                          <button onClick={() => { setEditingCategory({ name: catName, basePrice: 1.0 }); setShowCategoryModal(true); }} className="p-1 text-slate-400 hover:text-slate-900" aria-label={`Rename ${catName}`}>
                            <Edit2 className="w-4 h-4" />
                          </button>
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
