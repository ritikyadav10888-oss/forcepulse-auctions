import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { OVERLAY_THEMES, OVERLAY_LAYOUTS } from '../Screens/OverlayScreen';
import { HOST_DESIGNS } from '../Screens/HostScreen';
import { Radio, Newspaper, Dices, Monitor, Gamepad2, Youtube, ListOrdered, CheckCircle2, XCircle, Wallet, ExternalLink, Copy, Check, Lock } from 'lucide-react';

export const screenUrl = (screen, auctionId, extra = {}) => {
  const params = new URLSearchParams({ screen, auction: auctionId, ...extra });
  return `${window.location.origin}${window.location.pathname}?${params}`;
};

const ScreenCard = ({ icon: Icon, title, text, url, locked, children }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{text}</p>
        {children}
      </div>
      {locked ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700"><Lock className="w-3.5 h-3.5" /> Locked until Force Pulse upgrades this auction</p>
      ) : (
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-lime-500 hover:bg-lime-600 py-2.5 text-xs font-black uppercase text-slate-950">
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="w-3.5 h-3.5 text-lime-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
};

export const ScreensManager = () => {
  const { activeAuction, activeLock, runSettings, setRunSetting } = useAuction();
  const [theme, setTheme] = useState('lime');
  const [layout, setLayout] = useState('lower-third');
  const [chroma, setChroma] = useState(false);
  if (!activeAuction) return null;
  const id = activeAuction.id;
  const locked = activeLock.locked;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Auction Screens</h2>
        <p className="text-sm text-slate-500">
          Open each screen on its own display. They all follow the controller live. Open them in the same browser on this computer
          (e.g. a second monitor, projector or OBS).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ScreenCard
          icon={Monitor}
          title="Host Screen"
          text="Venue projector / LED wall. Shows 'yet to start', then the player on the floor with SOLD / UNSOLD stamps. Switch it to Upcoming, Sold, Unsold or Teams from the controller."
          url={screenUrl('host', id)}
          locked={locked}
        >
          <div className="pt-1 space-y-1.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Design (switches every open host screen live)</span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(HOST_DESIGNS).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRunSetting('hostDesign', key)}
                  aria-pressed={runSettings.hostDesign === key}
                  title={d.text}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${runSettings.hostDesign === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">{HOST_DESIGNS[runSettings.hostDesign]?.text}</p>
          </div>
        </ScreenCard>
        <ScreenCard
          icon={Radio}
          title="Live Screen (all-in-one)"
          text="The host screen with the auctioneer's control bar at the bottom: start the auction, load players by serial, type bids, Sold / Unsold. Requires sign-in."
          url={screenUrl('live-screen', id)}
          locked={locked}
        />
        <ScreenCard
          icon={Gamepad2}
          title="Auction Controller"
          text="The auctioneer's desk: load players, accept bids, run the clock, hammer sold / unsold and choose what the host screen shows. Requires sign-in."
          url={screenUrl('controller', id)}
          locked={locked}
        />
        <ScreenCard
          icon={Youtube}
          title="YouTube / Stream Overlay"
          text="Transparent lower-third for OBS, vMix or Streamlabs. Add it as a Browser Source at 1920×1080 on top of your camera."
          url={screenUrl('overlay', id, { layout, theme, ...(chroma ? { bg: 'green' } : {}) })}
          locked={locked}
        >
          <div className="pt-1 space-y-1.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Layout</span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(OVERLAY_LAYOUTS).map(([key, l]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayout(key)}
                  aria-pressed={layout === key}
                  title={l.text}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${layout === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">{OVERLAY_LAYOUTS[layout].text} Each layout is its own link, so you can stack several in OBS.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Overlay theme" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold">
              {Object.entries(OVERLAY_THEMES).map(([key, t]) => <option key={key} value={key}>{t.name}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={chroma} onChange={(e) => setChroma(e.target.checked)} /> Green-screen background
            </label>
          </div>
        </ScreenCard>
        <ScreenCard icon={ListOrdered} title="All Players" text="Every player and where they stand: yet to auction, on the table, sold or unsold. Filter by status and category." url={screenUrl('upcoming', id)} locked={locked} />
        <ScreenCard icon={CheckCircle2} title="Sold Players" text="Every sold player with the buying team and price, highest first." url={screenUrl('sold', id)} locked={locked} />
        <ScreenCard icon={XCircle} title="Unsold Players" text="Players who went unsold, ready for the re-auction round." url={screenUrl('unsold', id)} locked={locked} />
        <ScreenCard icon={Newspaper} title="Auction Updates" text="Live feed of sales, unsold players, lucky draws and new rounds, with running totals." url={screenUrl('updates', id)} locked={locked} />
        <ScreenCard icon={Dices} title="Team Lucky Draw" text="Shows the team lucky draw. Run a draw from the Live Screen menu or the controller." url={screenUrl('lucky-draw', id)} locked={locked} />
        <ScreenCard icon={Wallet} title="Teams & Purse" text="Live purse, spend, squad size and maximum bid for every team." url={screenUrl('teams', id)} locked={locked} />
      </div>
    </div>
  );
};
