import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { DEFAULT_TEAM_LOGO } from '../../config/placeholders';
import { uploadImage, IMAGE_SIZES } from '../../services/imageUpload';
import { MoneyInput } from '../MoneyInput';
import { BulkImport } from './BulkImport';
import { ContactForcePulseModal } from './PlanLock';
import { Plus, Edit2, Trash2, Shield, CheckCircle2, AlertCircle, CreditCard, ImagePlus, X } from 'lucide-react';
import { formatMoney } from '../../services/money';

export const TeamManager = () => {
  const { teams, addTeam, editTeam, deleteTeam, activeAuction, activeLock, canSetup, canEditPlayers, isSuperAdmin } = useAuction();
  const [showRequest, setShowRequest] = useState(false);
  // Organisers at their plan's team limit ask Force Pulse instead of adding more
  const atLimit = !isSuperAdmin && teams.length >= activeLock.teamLimit;

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Logo from this device: scaled down in the browser (PNG keeps transparent backgrounds), then stored on the server
  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      const url = await uploadImage(file, IMAGE_SIZES.teamLogo);
      setFormData(prev => ({ ...prev, logo: url }));
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoBusy(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    logo: DEFAULT_TEAM_LOGO,
    initialPurse: activeAuction?.purseLimit || 100,
    owner: '',
    coach: ''
  });

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      shortCode: '',
      logo: '',
      initialPurse: activeAuction?.purseLimit || 100,
      owner: '',
      coach: ''
    });
    setLogoError('');
    setShowModal(true);
  };

  const handleOpenEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      shortCode: team.shortCode,
      logo: team.logo === DEFAULT_TEAM_LOGO ? '' : team.logo,
      initialPurse: team.initialPurse,
      owner: team.owner || '',
      coach: team.coach || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const logo = formData.logo.trim() || DEFAULT_TEAM_LOGO;
    if (editingTeam) {
      editTeam(editingTeam.id, {
        ...formData,
        logo,
        initialPurse: Number(formData.initialPurse)
      });
    } else {
      // A Force Pulse admin going past the plan moves the auction up to the plan that fits
      if (isSuperAdmin && teams.length + 1 > activeLock.teamLimit &&
          !window.confirm(`Team #${teams.length + 1} is more than the ${activeLock.plan.name} plan allows (${activeLock.teamLimit}). Upgrade this auction's plan and add it?`)) {
        return;
      }
      addTeam({
        ...formData,
        logo,
        initialPurse: Number(formData.initialPurse)
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Auction Team Roster</h2>
          <p className="text-xs text-slate-500 font-medium">Create and edit franchise teams, assign purse budgets and logos</p>
        </div>

        {canEditPlayers && (
          <div className="flex flex-wrap items-center gap-2">
            <BulkImport kind="teams" />
            {atLimit ? (
              <button
                onClick={() => setShowRequest(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
              >
                <Plus className="w-4 h-4 text-lime-400" />
                Need more than {activeLock.teamLimit} teams? Ask Force Pulse
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Franchise Team
              </button>
            )}
          </div>
        )}
      </div>
      {showRequest && <ContactForcePulseModal onClose={() => setShowRequest(false)} />}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team, idx) => {
          const isFreeSlot = idx < activeLock.teamLimit;
          return (
            <div
              key={team.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between ${
                isFreeSlot ? 'border-slate-200' : 'border-amber-300 ring-1 ring-amber-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />
                    {isFreeSlot ? (
                      <span className="inline-flex items-center gap-1 bg-lime-100 text-lime-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-lime-300">
                        <CheckCircle2 className="w-3 h-3 text-lime-600" /> Team #{idx + 1}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-amber-300">
                        <CreditCard className="w-3 h-3 text-amber-600" /> Over plan limit
                      </span>
                    )}
                  </div>
                  {canEditPlayers && <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(team)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete team ${team.name}?`)) {
                          deleteTeam(team.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>}
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{team.name} ({team.shortCode})</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Coach: {team.coach || 'N/A'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Starting Purse</span>
                    <span className="font-extrabold text-slate-800">{formatMoney(team.initialPurse)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Current Remaining</span>
                    <span className="font-extrabold text-emerald-600">{formatMoney(team.purseRemaining)}</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900">
              {editingTeam ? 'Edit Team Details' : 'Add New Franchise Team'}
            </h3>

            {!editingTeam && teams.length >= activeLock.teamLimit && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block">This will lock the auction</span>
                  The {activeLock.plan.name} plan covers {activeLock.teamLimit} teams. Team #{teams.length + 1} locks bidding and screens until you contact Force Pulse to upgrade.
                </div>
              </div>
            )}

            {!editingTeam && teams.length < activeLock.teamLimit && (
              <div className="bg-lime-50 border border-lime-300 rounded-xl p-3 text-lime-900 text-xs font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block">Included in your plan</span>
                  Team #{teams.length + 1} of {activeLock.teamLimit} on the {activeLock.plan.name} plan.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai Titans"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Short Code</label>
                  <input
                    type="text"
                    required
                    placeholder="MT"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
                  />
                </div>
                <div>
                  <label className="block mb-1">Initial Purse</label>
                  <MoneyInput
                    label="Initial purse"
                    required
                    disabled={!canSetup}
                    title={canSetup ? undefined : 'The purse is set by Force Pulse'}
                    value={formData.initialPurse}
                    onChange={(v) => setFormData(prev => ({ ...prev, initialPurse: v }))}
                    inputClassName="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Team Logo <span className="ml-1 font-medium text-slate-400">{IMAGE_SIZES.teamLogo.label}, fitted without cropping</span></label>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img src={formData.logo || DEFAULT_TEAM_LOGO} alt="" className="h-20 w-20 rounded-xl border border-slate-200 bg-slate-100 object-contain p-1" />
                    {formData.logo && (
                      <button type="button" onClick={() => setFormData({ ...formData, logo: '' })} aria-label="Remove logo" className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white hover:bg-slate-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className={`flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 font-bold text-slate-600 ${logoBusy ? 'opacity-60' : 'cursor-pointer hover:border-lime-500 hover:text-lime-700'}`}>
                      <ImagePlus className="w-4 h-4" /> {logoBusy ? 'Uploading…' : 'Upload from device'}
                      <input type="file" accept="image/*" className="sr-only" disabled={logoBusy} onChange={uploadLogo} aria-label="Upload team logo from device" />
                    </label>
                    <input
                      type="text"
                      placeholder="…or paste an image link (https://…)"
                      aria-label="Team logo link"
                      value={formData.logo.startsWith('data:') ? '' : formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
                    />
                    {logoError && <p role="alert" className="font-bold text-red-600">{logoError}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Coach Name</label>
                  <input
                    type="text"
                    value={formData.coach}
                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Franchise Owner</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logoBusy}
                  className="bg-slate-950 text-white font-bold px-4 py-2 rounded-xl hover:bg-slate-800 shadow-sm"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
