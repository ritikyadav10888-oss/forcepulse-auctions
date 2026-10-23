import React, { useState } from 'react';
import { useAuction, suggestedBasePrice } from '../../context/AuctionContext';
import { formatMoney } from '../../services/money';
import { MoneyInput } from '../MoneyInput';
import { X, Layers } from 'lucide-react';

// Add or edit a player category and its base price. New players in the category start at that price.
export const CreateCategoryModal = ({ onClose, categoryToEdit = null }) => {
  const { addCategory, renameCategory, players, editPlayer, activeAuction } = useAuction();
  const suggested = suggestedBasePrice(activeAuction);
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [basePrice, setBasePrice] = useState(categoryToEdit ? (categoryToEdit.basePrice ?? '') : suggested);
  const [applyToBasePrice, setApplyToBasePrice] = useState(!!categoryToEdit);
  const price = Number(basePrice) || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    const ok = categoryToEdit ? renameCategory(categoryToEdit.name, clean, price) : addCategory(clean, price);
    if (!ok) return;
    // Players not yet sold take the new base price
    if (applyToBasePrice && price > 0) {
      players.filter(p => p.category === (categoryToEdit?.name || clean) && p.status !== 'SOLD' && p.status !== 'CURRENT')
        .forEach(p => editPlayer(p.id, { category: clean, basePrice: price, currentBid: price }));
    }
    onClose();
  };

  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-lime-500';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500 text-slate-950 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{categoryToEdit ? 'Edit Player Category' : 'Create Player Category'}</h3>
              <p className="text-xs text-slate-500 font-medium">Players added to this category start at its base price</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          <div>
            <label className="block mb-1 font-bold text-slate-800">Category Name *</label>
            <input type="text" required placeholder="e.g. Marquee, Set A, Batsman" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block mb-1 font-bold text-slate-800">
              Base Price{price > 0 && <span className="ml-1 font-medium text-slate-400">= {formatMoney(price)}</span>}
            </label>
            <MoneyInput label="Base price" placeholder="e.g. 5" value={basePrice} onChange={setBasePrice} inputClassName={input.replace('w-full ', '')} />
            <p className="mt-1 font-medium text-slate-500">
              Suggested for this auction: <strong>{formatMoney(suggested)}</strong>
              {price !== suggested && <button type="button" onClick={() => setBasePrice(suggested)} className="ml-1.5 font-bold text-lime-700 underline">Use it</button>}
              . Leave blank to set each player's price yourself.
            </p>
          </div>
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={applyToBasePrice} onChange={(e) => setApplyToBasePrice(e.target.checked)} className="rounded text-lime-600 focus:ring-lime-500" />
            Also set this price on players already in this category (not sold yet)
          </label>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">Cancel</button>
            <button type="submit" className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-black px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-sm">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  );
};
