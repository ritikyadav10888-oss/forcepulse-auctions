import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { X, Layers, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const CreateCategoryModal = ({ onClose, categoryToEdit = null }) => {
  const { editAuction, activeAuction } = useAuction();

  const [name, setName] = useState(categoryToEdit?.name || '');
  const [basePrice, setBasePrice] = useState(categoryToEdit?.basePrice || 1.0);
  const [minPlayerPerTeam, setMinPlayerPerTeam] = useState(categoryToEdit?.minPlayerPerTeam || 2);
  const [maxPlayerPerTeam, setMaxPlayerPerTeam] = useState(categoryToEdit?.maxPlayerPerTeam || 6);
  const [minBidIncrement, setMinBidIncrement] = useState(categoryToEdit?.minBidIncrement || 0.25);
  const [applyToBasePrice, setApplyToBasePrice] = useState(true);

  // Increment slabs (repeater)
  const [slabs, setSlabs] = useState(categoryToEdit?.slabs || [
    { upToPrice: 1.0, increment: 0.1 },
    { upToPrice: 5.0, increment: 0.25 },
    { upToPrice: 10.0, increment: 0.5 },
    { upToPrice: 100.0, increment: 1.0 }
  ]);

  const handleAddSlab = () => {
    setSlabs([...slabs, { upToPrice: 10.0, increment: 0.5 }]);
  };

  const handleRemoveSlab = (index) => {
    setSlabs(slabs.filter((_, i) => i !== index));
  };

  const handleSlabChange = (index, field, value) => {
    const updated = [...slabs];
    updated[index][field] = Number(value);
    setSlabs(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const existingCategories = activeAuction?.categories || ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
    let updatedCategories = [...existingCategories];

    if (categoryToEdit) {
      updatedCategories = updatedCategories.map(c => c === categoryToEdit.name ? name : c);
    } else {
      if (!updatedCategories.includes(name)) {
        updatedCategories.push(name);
      }
    }

    editAuction(activeAuction.id, { categories: updatedCategories });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500 text-slate-950 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">
                {categoryToEdit ? 'Edit Player Category' : 'Create Player Category'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Configure base price & bid increment slabs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          <div>
            <label className="block mb-1 font-bold text-slate-800">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Batsman, Bowler, All-Rounder"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800 font-medium">Player Base Price (Cr) *</label>
              <input
                type="number"
                required
                step="0.25"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-800">Minimum Bid Increment (Cr) *</label>
              <input
                type="number"
                required
                step="0.05"
                value={minBidIncrement}
                onChange={(e) => setMinBidIncrement(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800">Min Player Per Team *</label>
              <input
                type="number"
                required
                value={minPlayerPerTeam}
                onChange={(e) => setMinPlayerPerTeam(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-800">Max Player Per Team *</label>
              <input
                type="number"
                required
                value={maxPlayerPerTeam}
                onChange={(e) => setMaxPlayerPerTeam(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
          </div>

          {/* Bid Increment Slabs Repeater */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase">Bid Increment Slabs</span>
              <button
                type="button"
                onClick={handleAddSlab}
                className="flex items-center gap-1 bg-lime-500 hover:bg-lime-600 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-lg"
              >
                <Plus className="w-3 h-3" /> Add Slab
              </button>
            </div>

            <div className="space-y-2">
              {slabs.map((slab, i) => (
                <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Up to Price (Cr)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={slab.upToPrice}
                      onChange={(e) => handleSlabChange(i, 'upToPrice', e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 rounded p-1"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Increment Step (Cr)</span>
                    <input
                      type="number"
                      step="0.05"
                      value={slab.increment}
                      onChange={(e) => handleSlabChange(i, 'increment', e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 rounded p-1"
                    />
                  </div>
                  {slabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(i)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded mt-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="applyBase"
              checked={applyToBasePrice}
              onChange={(e) => setApplyToBasePrice(e.target.checked)}
              className="rounded text-lime-600 focus:ring-lime-500"
            />
            <label htmlFor="applyBase" className="text-xs font-semibold text-slate-700">
              Apply base price to existing players in this category
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-black px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-sm"
            >
              Save Category
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
