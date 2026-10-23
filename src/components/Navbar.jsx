import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { LoginModal } from './Auth/LoginModal';
import { Logo, Button } from './ui';

// [path, page, label]. How it works / Pricing are sections of the home page; Contact lives in the footer
const NAV_LINKS = [
  ['/', 'HOME', 'Home'],
  ['/auctions', 'BROWSE', 'Auctions'],
  ['/how-to-use', 'HOW-TO-USE', 'How it works'],
  ['/pricing', 'PRICING', 'Pricing']
];

export const Navbar = ({ currentPage, onNavigate, onOpenAccount }) => {
  const { currentUser, logoutUser, isSuperAdmin } = useAuction();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (page) => currentPage === page || (page === 'BROWSE' && currentPage === 'AUCTION');
  const go = (path) => { setMenuOpen(false); onNavigate(path); };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <button onClick={() => go('/')} className="shrink-0" aria-label="Force Pulse home">
              <Logo dark />
            </button>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {NAV_LINKS.map(([path, page, label]) => (
                <button
                  key={page}
                  onClick={() => go(path)}
                  aria-current={isActive(page) ? 'page' : undefined}
                  className={`relative px-3.5 py-2 text-sm font-bold transition-colors ${isActive(page) ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {label}
                  {isActive(page) && <span className="absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-full bg-lime-500" />}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {currentUser ? (
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
                  <button
                    onClick={() => { setMenuOpen(false); onOpenAccount(); }}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors ${currentPage === 'ADMIN' ? 'bg-lime-500 text-slate-950' : 'hover:bg-white/10'}`}
                    title="Open my dashboard"
                    aria-label="Open my dashboard"
                  >
                    <span className={`flex w-6 h-6 items-center justify-center rounded-md text-[11px] font-black ${currentPage === 'ADMIN' ? 'bg-slate-950 text-lime-400' : 'bg-lime-500 text-slate-950'}`}>
                      {currentUser.email.charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:block text-left leading-tight">
                      <span className="block text-xs font-extrabold">Dashboard</span>
                      <span className={`hidden xl:block max-w-36 truncate text-[10px] font-bold ${currentPage === 'ADMIN' ? 'text-slate-800' : 'text-slate-400'}`}>
                        {isSuperAdmin ? 'Force Pulse Admin' : currentUser.email}
                      </span>
                    </span>
                  </button>
                  <button onClick={logoutUser} className="rounded-md p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400" title="Log out" aria-label="Log out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setShowAuth(true)}>
                  <LogIn className="w-4 h-4" /> <span>Sign in</span>
                </Button>
              )}

              <button
                onClick={() => setMenuOpen(o => !o)}
                className="lg:hidden rounded-lg p-2 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Small screens: dropdown menu */}
        {menuOpen && (
          <nav className="lg:hidden border-t border-white/10 bg-slate-950 px-4 pb-4 pt-2" aria-label="Main">
            {NAV_LINKS.map(([path, page, label]) => (
              <button
                key={page}
                onClick={() => go(path)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-bold ${isActive(page) ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`}
              >
                {label}
                {isActive(page) && <span className="w-2 h-2 rounded-full bg-lime-500" />}
              </button>
            ))}
            <button onClick={() => go('/contact')} className="flex w-full rounded-lg px-3 py-3 text-base font-bold text-slate-300 hover:bg-white/5">Contact</button>
          </nav>
        )}
      </header>

      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
    </>
  );
};
