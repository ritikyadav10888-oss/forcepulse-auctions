import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { LogIn, LogOut, Activity } from 'lucide-react';
import { LoginModal } from './Auth/LoginModal';

// [path, page, label]. Featured / How to Use / Pricing / Contact are sections of the home page
const NAV_LINKS = [
  ['/', 'HOME', 'Home'],
  ['/auctions', 'BROWSE', 'Browse Auctions'],
  ['/featured', 'FEATURED', 'Featured'],
  ['/how-to-use', 'HOW-TO-USE', 'How to Use'],
  ['/pricing', 'PRICING', 'Pricing'],
  ['/contact', 'CONTACT', 'Contact Us']
];

export const Navbar = ({ currentPage, onNavigate, onOpenAccount }) => {
  const {
    currentUser,
    logoutUser,
    isSuperAdmin
  } = useAuction();

  const [showAuth, setShowAuth] = useState(false);

  const isActive = (page) => currentPage === page || (page === 'BROWSE' && currentPage === 'AUCTION');

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Force Pulse Logo & Branding */}
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 shrink-0"
              aria-label="Force Pulse home"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-left leading-none">
                <span className="font-bebas text-2xl tracking-wider text-slate-900 block">
                  FORCE <span className="text-lime-500">PULSE</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Player Auctions
                </span>
              </div>
            </button>

            {/* Site navigation */}
            <nav className="hidden xl:flex items-center gap-1">
              {NAV_LINKS.map(([path, page, label]) => (
                <button
                  key={page}
                  onClick={() => onNavigate(path)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                    isActive(page) ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Right Controls: Account */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

              {currentUser ? (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                  {/* Opens the signed-in user's own account */}
                  <button
                    onClick={onOpenAccount}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-colors ${
                      currentPage === 'ADMIN' ? 'bg-slate-900 text-white' : 'hover:bg-slate-200/60'
                    }`}
                    title="Open my account"
                  >
                    <div className="w-6 h-6 rounded-full bg-lime-500 text-slate-950 flex items-center justify-center font-black text-[10px]">
                      {currentUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left leading-tight">
                      <span className={`font-extrabold text-xs block ${currentPage === 'ADMIN' ? 'text-white' : 'text-slate-900'}`}>
                        My Account
                      </span>
                      <span className="hidden xl:block text-[9px] font-bold text-lime-600 truncate max-w-36">
                        {isSuperAdmin ? 'Force Pulse Admin' : currentUser.email}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={logoutUser}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                // One button; the modal has Login and Sign Up tabs
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 bg-lime-500 hover:bg-lime-600 text-slate-950 font-extrabold text-xs px-3 sm:px-4 py-2 rounded-xl transition-all shadow-sm whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login / Sign Up</span>
                </button>
              )}

            </div>

          </div>

          {/* Small screens: scrollable page links */}
          <nav className="xl:hidden flex gap-2 pb-3 overflow-x-auto">
            {NAV_LINKS.map(([path, page, label]) => (
              <button
                key={page}
                onClick={() => onNavigate(path)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${isActive(page) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </nav>

        </div>
      </header>

      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
    </>
  );
};
