import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { DEFAULT_PLAYER_PHOTO } from '../../config/placeholders';
import { uploadImage, IMAGE_SIZES } from '../../services/imageUpload';
import { MoneyInput } from '../MoneyInput';
import { BulkImport } from './BulkImport';
import { Plus, Edit2, Trash2, UserPlus, FileSpreadsheet, Search, Undo2, Gavel, ImagePlus, X } from 'lucide-react';
import { formatMoney } from '../../services/money';

// Extra career stats shown on the "Player Profile" host design (optional, blank = hidden)
const PROFILE_STAT_FIELDS = [['highestScore', 'Highest score', '1'], ['average', 'Average', '0.01'], ['strikeRate', 'Strike rate', '0.01'], ['fifties', '50s', '1'], ['hundreds', '100s', '1']];
const EMPTY_PROFILE_STATS = Object.fromEntries(PROFILE_STAT_FIELDS.map(([k]) => [k, '']));

export const PlayerManager = () => {
  const { players, addPlayer, editPlayer, deletePlayer, releasePlayer, reopenLastPlayer, activeAuction, canEditPlayers } = useAuction();
  const infoLabels = (activeAuction?.playerInfoLabels || []).map(l => (l || '').trim()).filter(Boolean);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const tournamentCategories = activeAuction?.categories?.length ? activeAuction.categories : ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
  // A new player starts at this tournament's most common base price (2% of the purse when it has no players yet)
  const usualBasePrice = () => {
    const counts = {};
    players.forEach(p => { counts[p.basePrice] = (counts[p.basePrice] || 0) + 1; });
    const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (common) return Number(common[0]);
    return Math.max(0.01, Math.round((Number(activeAuction?.purseLimit) || 1) * 2) / 100);
  };
  const categoryPrice = (category) => Number(activeAuction?.categoryPrices?.[category]) || 0;
  const blankForm = () => ({
    name: '',
    category: tournamentCategories[0],
    role: '',
    basePrice: categoryPrice(tournamentCategories[0]) || usualBasePrice(),
    country: 'India',
    isOverseas: false,
    image: '',
    setNo: players.reduce((max, p) => Math.max(max, Number(p.setNo) || 0), 0) + 1,
    matches: '',
    runs: '',
    wickets: '',
    ...EMPTY_PROFILE_STATS,
    age: '',
    battingStyle: '',
    bowlingStyle: '',
    previousTeam: '',
    extraInfo: {}
  });
  const [formData, setFormData] = useState(blankForm);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setFormData(blankForm());
    setPhotoError('');
    setShowModal(true);
  };

  // Photo from this device: scaled down in the browser, then stored on the server
  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const url = await uploadImage(file, IMAGE_SIZES.playerPhoto);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleOpenEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      category: player.category,
      role: player.role,
      basePrice: player.basePrice,
      country: player.country,
      isOverseas: player.isOverseas || false,
      image: player.image === DEFAULT_PLAYER_PHOTO ? '' : player.image,
      setNo: player.setNo || 1,
      matches: player.stats?.matches ?? '',
      runs: player.stats?.runs ?? '',
      wickets: player.stats?.wickets ?? '',
      ...Object.fromEntries(PROFILE_STAT_FIELDS.map(([k]) => [k, player.stats?.[k] ?? ''])),
      age: player.age || '',
      battingStyle: player.battingStyle || '',
      bowlingStyle: player.bowlingStyle || '',
      previousTeam: player.previousTeam || '',
      extraInfo: { ...(player.extraInfo || {}) }
    });
    setPhotoError('');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const playerData = {
      name: formData.name,
      category: formData.category,
      role: formData.role,
      basePrice: Number(formData.basePrice),
      country: formData.country,
      isOverseas: formData.isOverseas,
      image: formData.image.trim() || DEFAULT_PLAYER_PHOTO,
      setNo: Number(formData.setNo),
      age: formData.age ? Number(formData.age) : '',
      battingStyle: formData.battingStyle.trim(),
      bowlingStyle: formData.bowlingStyle.trim(),
      previousTeam: formData.previousTeam.trim(),
      // Custom fields defined in the auction's "Player info settings"
      extraInfo: Object.fromEntries(infoLabels.map(l => [l, (formData.extraInfo?.[l] || '').trim()]).filter(([, v]) => v)),
      stats: {
        ...(editingPlayer?.stats || {}),
        matches: Number(formData.matches) || 0,
        runs: Number(formData.runs) || 0,
        wickets: Number(formData.wickets) || 0,
        ...Object.fromEntries(PROFILE_STAT_FIELDS.map(([k]) => [k, formData[k] === '' ? '' : Number(formData[k])]))
      }
    };

    if (editingPlayer) {
      editPlayer(editingPlayer.id, playerData);
    } else {
      addPlayer(playerData);
    }
    setShowModal(false);
  };

  // Filters: status tab + category + text search (name, role, country)
  const STATUS_TABS = [
    ['ALL', 'All', () => true],
    ['UPCOMING', 'Upcoming', p => p.status === 'UPCOMING'],
    ['CURRENT', 'On the floor', p => p.status === 'CURRENT'],
    ['SOLD', 'Sold', p => p.status === 'SOLD'],
    ['UNSOLD', 'Unsold', p => p.status === 'UNSOLD']
  ];
  const statusTest = (STATUS_TABS.find(([id]) => id === statusFilter) || STATUS_TABS[0])[2];
  const categories = [...new Set([...(activeAuction?.categories || []), ...players.map(p => p.category)].filter(Boolean))];
  const q = searchTerm.trim().toLowerCase();
  const matchesText = p => !q || [p.name, p.role, p.country].some(v => (v || '').toLowerCase().includes(q));
  const matchesCategory = p => categoryFilter === 'ALL' || p.category === categoryFilter;

  const filteredPlayers = players.filter(p => statusTest(p) && matchesCategory(p) && matchesText(p));
  const filtersOn = statusFilter !== 'ALL' || categoryFilter !== 'ALL' || q;
  const clearFilters = () => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSearchTerm(''); };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Auction Players Registry</h2>
          <p className="text-xs text-slate-500 font-medium">Add players, assign categories & base price, set bidding sequence</p>
        </div>

        {canEditPlayers && <div className="flex flex-wrap items-center gap-2">
          <BulkImport kind="players" />
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Single Player
          </button>
        </div>}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status tabs */}
          <div role="tablist" aria-label="Player status" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {STATUS_TABS.map(([id, label, test]) => (
              <button
                key={id}
                role="tab"
                aria-selected={statusFilter === id}
                onClick={() => setStatusFilter(id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label} <span className={statusFilter === id ? 'text-lime-400' : 'text-slate-400'}>{players.filter(test).length}</span>
              </button>
            ))}
          </div>

          {/* Text search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, role or country…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search players"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Category</span>
          {['ALL', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              aria-pressed={categoryFilter === cat}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                categoryFilter === cat ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat} <span className="opacity-70">{cat === 'ALL' ? players.filter(statusTest).length : players.filter(p => statusTest(p) && p.category === cat).length}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong className="text-slate-900">{filteredPlayers.length}</strong> of {players.length} players</span>
          {filtersOn && <button onClick={clearFilters} className="font-bold text-lime-700 hover:underline">Clear filters</button>}
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">Player</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Base Price</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    <img src={player.image} alt={player.name} className="w-9 h-9 rounded-full object-cover object-top border border-slate-200" />
                    <div>
                      <span className="font-bold text-slate-900 block">{player.name}</span>
                      <span className="text-[10px] text-slate-400">{player.country} • Set #{player.setNo}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-lime-50 text-lime-700 px-2 py-0.5 rounded font-bold">
                      {player.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{player.role}</td>
                  <td className="p-3.5 font-bold text-slate-900">{formatMoney(player.basePrice)}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      player.status === 'SOLD'
                        ? 'bg-emerald-100 text-emerald-800'
                        : player.status === 'UNSOLD'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {player.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1">
                    {canEditPlayers && <>
                    {player.status === 'SOLD' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Put ${player.name} back on the table? The sale is undone and bidding reopens at ${formatMoney(player.soldPrice)} with the same team leading. Any player on the table now goes back to the queue.`)) {
                            reopenLastPlayer(player.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-lime-700 rounded"
                        title="Back on the table (reopen bidding)"
                      >
                        <Gavel className="w-4 h-4" />
                      </button>
                    )}
                    {player.status === 'SOLD' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Release ${player.name} back to the auction pool? The team gets ${formatMoney(player.soldPrice)} refunded.`)) {
                            releasePlayer(player.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded"
                        title="Release to pool (refund team)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(player)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete player ${player.name}?${player.status === 'SOLD' ? ' Their team will be refunded.' : ''}`)) {
                          deletePlayer(player.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPlayers.length === 0 && (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">No players match these filters.</p>
            {filtersOn && <button onClick={clearFilters} className="text-xs font-bold text-lime-700 hover:underline">Clear filters</button>}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-slate-900">
              {editingPlayer ? 'Edit Player Info' : 'Add Player to Auction'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Player Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jasprit Bumrah"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, basePrice: categoryPrice(e.target.value) || formData.basePrice })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  >
                    {[...new Set([...tournamentCategories, formData.category].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Base Price{Number(formData.basePrice) > 0 && <span className="ml-1 font-medium text-slate-400">= {formatMoney(Number(formData.basePrice))}</span>}</label>
                  <MoneyInput
                    label="Base price"
                    required
                    value={formData.basePrice}
                    onChange={(v) => setFormData(prev => ({ ...prev, basePrice: v }))}
                    inputClassName="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Role Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Opener, Fast Bowler"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Photo <span className="ml-1 font-medium text-slate-400">{IMAGE_SIZES.playerPhoto.label}, shown whole</span></label>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img src={formData.image || DEFAULT_PLAYER_PHOTO} alt="" className="aspect-[4/5] w-20 rounded-xl border border-slate-200 bg-slate-100 object-contain" />
                    {formData.image && (
                      <button type="button" onClick={() => setFormData({ ...formData, image: '' })} aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white hover:bg-slate-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className={`flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 font-bold text-slate-600 ${photoBusy ? 'opacity-60' : 'cursor-pointer hover:border-lime-500 hover:text-lime-700'}`}>
                      <ImagePlus className="w-4 h-4" /> {photoBusy ? 'Uploading…' : 'Upload from device'}
                      <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={uploadPhoto} aria-label="Upload player photo from device" />
                    </label>
                    <input
                      type="text"
                      placeholder="…or paste an image link (https://…)"
                      aria-label="Photo image link"
                      value={formData.image.startsWith('data:') ? '' : formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                    {photoError && <p role="alert" className="font-bold text-red-600">{photoError}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isOverseas"
                  checked={formData.isOverseas}
                  onChange={(e) => setFormData({ ...formData, isOverseas: e.target.checked })}
                  className="rounded text-lime-700 focus:ring-lime-500"
                />
                <label htmlFor="isOverseas" className="text-xs text-slate-700">Overseas Player</label>
              </div>

              {/* Profile & stats shown on the host screen (optional) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block mb-1">Age</label>
                  <input
                    type="number" min="10" max="70"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Set No.</label>
                  <input
                    type="number" min="1"
                    value={formData.setNo}
                    onChange={(e) => setFormData({ ...formData, setNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Batting style</label>
                  <input
                    type="text"
                    value={formData.battingStyle}
                    onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Bowling style</label>
                  <input
                    type="text"
                    value={formData.bowlingStyle}
                    onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="block mb-1">Previous team</label>
                  <input
                    type="text"
                    value={formData.previousTeam}
                    onChange={(e) => setFormData({ ...formData, previousTeam: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                {infoLabels.map(l => (
                  <div key={l} className="col-span-2">
                    <label className="block mb-1">{l}</label>
                    <input
                      type="text"
                      aria-label={l}
                      value={formData.extraInfo?.[l] || ''}
                      onChange={(e) => setFormData({ ...formData, extraInfo: { ...formData.extraInfo, [l]: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                ))}
                <div>
                  <label className="block mb-1">Matches</label>
                  <input
                    type="number" min="0"
                    value={formData.matches}
                    onChange={(e) => setFormData({ ...formData, matches: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Runs / points</label>
                  <input
                    type="number" min="0"
                    value={formData.runs}
                    onChange={(e) => setFormData({ ...formData, runs: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block mb-1">Wickets / tackles</label>
                  <input
                    type="number" min="0"
                    value={formData.wickets}
                    onChange={(e) => setFormData({ ...formData, wickets: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                {PROFILE_STAT_FIELDS.map(([k, label, step]) => (
                  <div key={k}>
                    <label className="block mb-1">{label}</label>
                    <input
                      type="number" min="0" step={step}
                      value={formData[k]}
                      onChange={(e) => setFormData({ ...formData, [k]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                ))}
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
                  disabled={photoBusy}
                  className="bg-slate-950 text-white font-bold px-4 py-2 rounded-xl hover:bg-slate-800 shadow-sm"
                >
                  Save Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
