import React, { useState } from 'react';
import { api } from '../../services/serverSync';
import { uploadImage, IMAGE_SIZES } from '../../services/imageUpload';
import { DEFAULT_PLAYER_PHOTO } from '../../config/placeholders';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';

const EMPTY = {
  name: '', phone: '', category: '', role: '', age: '', country: '', isOverseas: false,
  battingStyle: '', bowlingStyle: '', previousTeam: '', matches: '', runs: '', wickets: '', notes: '', image: ''
};

// Public sign-up form for one auction: #/register/<auctionId>
export const PlayerRegistration = ({ auction, onBack }) => {
  const categories = auction.categories || [];
  const [form, setForm] = useState({ ...EMPTY, category: categories[0] || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file, IMAGE_SIZES.playerPhoto);
      setForm(f => ({ ...f, image: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/registrations', { method: 'POST', body: { ...form, auctionId: auction.id } });
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500';
  const label = 'block text-xs font-bold text-slate-600';

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-3">
        <CheckCircle2 className="mx-auto w-12 h-12 text-lime-600" />
        <h1 className="text-xl font-extrabold text-slate-900">You're registered!</h1>
        <p className="text-sm text-slate-600">The organisers of <strong>{auction.title}</strong> will review your details. If you're approved, you'll appear in the auction's player list.</p>
        <button onClick={onBack} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Back to the auction</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-lime-400">Player registration</div>
        <h1 className="mt-1 font-bebas text-4xl tracking-wide">{auction.title}</h1>
        {auction.startDate && <p className="text-sm text-slate-400">Auction on {new Date(auction.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>}
      </div>

      {!auction.registrationOpen ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-2">
          <h2 className="text-lg font-extrabold text-slate-900">Registration is closed</h2>
          <p className="text-sm text-slate-500">This auction isn't accepting player sign-ups right now. Please contact the organiser.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <img src={form.image || DEFAULT_PLAYER_PHOTO} alt="" className="h-24 w-20 rounded-2xl object-cover bg-slate-200" />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {form.image ? 'Change photo' : 'Add your photo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} className="sr-only" disabled={uploading} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Full name *<input required maxLength={80} value={form.name} onChange={set('name')} className={input} /></label>
            <label className={label}>Phone (WhatsApp) *<input required type="tel" maxLength={20} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={input} /></label>
            {categories.length > 0 && (
              <label className={label}>Category *
                <select required value={form.category} onChange={set('category')} className={input}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            <label className={label}>Playing role<input maxLength={60} value={form.role} onChange={set('role')} placeholder="e.g. Opening batsman" className={input} /></label>
            <label className={label}>Age<input type="number" min="5" max="99" value={form.age} onChange={set('age')} className={input} /></label>
            <label className={label}>Country / city<input maxLength={40} value={form.country} onChange={set('country')} className={input} /></label>
            <label className={label}>Batting style<input maxLength={40} value={form.battingStyle} onChange={set('battingStyle')} placeholder="e.g. Right-hand bat" className={input} /></label>
            <label className={label}>Bowling style<input maxLength={40} value={form.bowlingStyle} onChange={set('bowlingStyle')} placeholder="e.g. Right-arm medium" className={input} /></label>
            <label className={label}>Previous team<input maxLength={60} value={form.previousTeam} onChange={set('previousTeam')} className={input} /></label>
            <label className="flex items-center gap-2 pt-6 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.isOverseas} onChange={set('isOverseas')} className="h-4 w-4 accent-lime-600" /> Overseas player
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className={label}>Matches<input type="number" min="0" value={form.matches} onChange={set('matches')} className={input} /></label>
            <label className={label}>Runs<input type="number" min="0" value={form.runs} onChange={set('runs')} className={input} /></label>
            <label className={label}>Wickets<input type="number" min="0" value={form.wickets} onChange={set('wickets')} className={input} /></label>
          </div>

          <label className={label}>Anything else the organisers should know?<textarea rows={3} maxLength={300} value={form.notes} onChange={set('notes')} className={input} /></label>

          {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
          <p className="text-xs text-slate-500">Your phone number is shared only with the auction organisers.</p>
          <button type="submit" disabled={busy || uploading} className="w-full rounded-xl bg-lime-500 hover:bg-lime-600 disabled:opacity-60 py-3 text-sm font-black uppercase tracking-wider text-slate-950">
            {busy ? 'Sending…' : 'Register'}
          </button>
        </form>
      )}
    </div>
  );
};
