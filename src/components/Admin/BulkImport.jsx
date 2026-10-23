import React, { useRef, useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { playersFromCSV, teamsFromCSV, PLAYER_TEMPLATE, TEAM_TEMPLATE, downloadText } from '../../services/csvImport';
import { Upload, FileDown, X } from 'lucide-react';

// Force Pulse admin: upload teams or players for the open auction from a CSV file
export const BulkImport = ({ kind }) => {
  const { activeAuction, importTeams, importPlayers, isSuperAdmin, canEditPlayers } = useAuction();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { items, errors, fileName }
  const [result, setResult] = useState('');
  const isPlayers = kind === 'players';
  // Organisers import their own players; teams come from Force Pulse
  if (!(isPlayers ? canEditPlayers : isSuperAdmin)) return null;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = isPlayers
      ? playersFromCSV(text, { categoryPrices: activeAuction?.categoryPrices || {} })
      : teamsFromCSV(text, { defaultPurse: activeAuction?.purseLimit || 100 });
    setResult('');
    setPreview({ ...parsed, fileName: file.name });
  };

  const confirm = () => {
    const count = isPlayers ? importPlayers(preview.items) : importTeams(preview.items);
    setResult(`${count} ${isPlayers ? 'players' : 'teams'} added from ${preview.fileName}.`);
    setPreview(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white"
      >
        <Upload className="w-4 h-4 text-lime-400" /> Upload {isPlayers ? 'players' : 'teams'} CSV
      </button>
      <button
        onClick={() => downloadText(isPlayers ? 'players-template.csv' : 'teams-template.csv', isPlayers ? PLAYER_TEMPLATE : TEAM_TEMPLATE)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        <FileDown className="w-4 h-4" /> Template
      </button>
      {result && <span role="status" className="text-xs font-bold text-lime-700">{result}</span>}

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Upload {preview.fileName}</h3>
                <p className="text-sm text-slate-500">{preview.items.length} {isPlayers ? 'players' : 'teams'} ready to add to {activeAuction?.title}.</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            {preview.errors.length > 0 && (
              <ul className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1 max-h-32 overflow-y-auto">
                {preview.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}

            <div className="overflow-auto rounded-xl border border-slate-200 flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                  {isPlayers ? (
                    <tr><th className="p-2">Name</th><th className="p-2">Category</th><th className="p-2">Base (Cr)</th><th className="p-2">Country</th><th className="p-2">Overseas</th><th className="p-2">Set</th></tr>
                  ) : (
                    <tr><th className="p-2">Name</th><th className="p-2">Code</th><th className="p-2">Purse (Cr)</th><th className="p-2">Owner</th><th className="p-2">Coach</th></tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.items.map((it, i) => isPlayers ? (
                    <tr key={i}><td className="p-2 font-bold">{it.name}</td><td className="p-2">{it.category}</td><td className="p-2">{it.basePrice}</td><td className="p-2">{it.country}</td><td className="p-2">{it.isOverseas ? 'Yes' : 'No'}</td><td className="p-2">{it.setNo}</td></tr>
                  ) : (
                    <tr key={i}><td className="p-2 font-bold">{it.name}</td><td className="p-2">{it.shortCode}</td><td className="p-2">{it.initialPurse}</td><td className="p-2">{it.owner}</td><td className="p-2">{it.coach}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setPreview(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
              <button
                onClick={confirm}
                disabled={preview.items.length === 0}
                className="rounded-xl bg-lime-500 hover:bg-lime-600 disabled:bg-slate-200 disabled:text-slate-400 px-4 py-2.5 text-sm font-black text-slate-950"
              >
                Add {preview.items.length} {isPlayers ? 'players' : 'teams'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
