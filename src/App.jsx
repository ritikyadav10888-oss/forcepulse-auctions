import React, { useEffect, useState } from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { Navbar } from './components/Navbar';
import { PublicHome } from './components/Public/PublicHome';
import { BrowseAuctions } from './components/Public/BrowseAuctions';
import { AuctionDetail } from './components/Public/AuctionDetail';
import { AdminPanel } from './components/Dashboard/AdminPanel';
import { UserDashboard } from './components/Dashboard/UserDashboard';
import { HostScreen } from './components/Screens/HostScreen';
import { OverlayScreen } from './components/Screens/OverlayScreen';
import { LiveScreen } from './components/Screens/LiveScreen';
import { LoginModal } from './components/Auth/LoginModal';
import { PlayerRegistration } from './components/Public/PlayerRegistration';
import { Logo, LogoMark } from './components/ui';

// Auction screens open in their own window and follow the controller live:
//   ?screen=host|upcoming|sold|unsold|teams  venue / projector display
//   ?screen=overlay                          YouTube / OBS lower-third (transparent)
//   ?screen=live-screen                      bidding: host screen + control bar (sign-in required)
//                                            (?screen=controller, the old desk link, opens it too)
// &auction=<id> picks the auction; ?screen=live is kept as an alias of host.
const searchParams = new URLSearchParams(window.location.search);
const screen = searchParams.get('screen');
const screenAuctionId = searchParams.get('auction');
const PINNED_HOST_VIEWS = { player: 'AUTO', upcoming: 'UPCOMING', sold: 'SOLD', unsold: 'UNSOLD', teams: 'TEAMS', 'lucky-draw': 'LUCKY_DRAW', updates: 'UPDATES', title: 'TITLE' };

const ScreenApp = () => {
  const { auctions, activeAuctionId, setActiveAuctionId } = useAuction();
  const targetId = screenAuctionId || activeAuctionId;
  const exists = auctions.some(a => a.id === targetId);

  useEffect(() => {
    if (exists && targetId !== activeAuctionId) setActiveAuctionId(targetId);
  }, [exists, targetId]);

  if (!exists) {
    return <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xl">Auction not found.</main>;
  }
  if (targetId !== activeAuctionId) return null;

  if (screen === 'overlay') return <OverlayScreen />;
  if (screen === 'live-screen' || screen === 'controller') return <LiveScreen />;
  return <HostScreen forcedView={PINNED_HOST_VIEWS[screen]} forcedDesign={searchParams.get('design')} />;
};

// Hash routes: #/  ·  #/auctions  ·  #/auctions/<auctionId>  ·  #/register/<auctionId> (player sign-up)
// #/featured, #/how-to-use, #/pricing and #/contact open the home page at that section
// #/reset/<token> is the link from the forgot-password email
const HOME_SECTIONS = ['featured', 'how-to-use', 'pricing', 'contact'];
const parseRoute = () => {
  const [section, id] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (section === 'reset' && id) return { page: 'HOME', resetToken: id };
  if (section === 'register' && id) return { page: 'REGISTER', auctionId: decodeURIComponent(id) };
  if (section === 'auctions' && id) return { page: 'AUCTION', auctionId: decodeURIComponent(id) };
  if (section === 'auctions') return { page: 'BROWSE' };
  if (HOME_SECTIONS.includes(section)) return { page: section.toUpperCase(), section };
  return { page: 'HOME' };
};

const AppContent = () => {
  const { role, setRole, auctions, activeAuctionId, setActiveAuctionId, isSuperAdmin } = useAuction();
  const [route, setRoute] = useState(parseRoute);
  const [showLogin, setShowLogin] = useState(false);
  // Bumped on every navigation so clicking the current link scrolls again
  const [scrollTick, setScrollTick] = useState(0);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRoute());
      setScrollTick(t => t + 1);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Runs after the page has rendered, so home-page sections exist to scroll to
  useEffect(() => {
    const target = route.section && role !== 'ADMIN' && document.getElementById(route.section);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo(0, 0);
  }, [route, role, scrollTick]);

  // The detail page reads auction-scoped data, so make the routed auction the active one
  const routedAuction = route.page === 'AUCTION' || route.page === 'REGISTER' ? auctions.find(a => a.id === route.auctionId) : null;
  useEffect(() => {
    if (routedAuction && routedAuction.id !== activeAuctionId) setActiveAuctionId(routedAuction.id);
  }, [routedAuction?.id]);

  const navigate = (path) => {
    if (role === 'ADMIN') setRole('USER');
    if (window.location.hash === `#${path}`) setScrollTick(t => t + 1);
    else window.location.hash = path;
  };

  const goOrganise = () => {
    if (!setRole('ADMIN')) setShowLogin(true);
    else window.scrollTo(0, 0);
  };

  let page;
  if (role === 'ADMIN') {
    // Force Pulse staff get the admin panel; organisers get their own dashboard
    page = isSuperAdmin ? <AdminPanel /> : <UserDashboard />;
  } else if (route.page === 'BROWSE') {
    page = <BrowseAuctions onBack={() => navigate('/')} onOpenAuction={(id) => navigate(`/auctions/${encodeURIComponent(id)}`)} />;
  } else if (route.page === 'REGISTER') {
    page = routedAuction
      ? <PlayerRegistration key={routedAuction.id} auction={routedAuction} onBack={() => navigate(`/auctions/${encodeURIComponent(routedAuction.id)}`)} />
      : <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">This registration link isn't valid. Please check it with the organiser.</div>;
  } else if (route.page === 'AUCTION') {
    page = !routedAuction ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">Auction not found</h2>
        <p className="text-sm text-slate-500">It may have been removed by the organiser.</p>
        <button onClick={() => navigate('/auctions')} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Browse auctions</button>
      </div>
    ) : routedAuction.id === activeAuctionId ? (
      <AuctionDetail key={routedAuction.id} onBack={() => navigate('/auctions')} />
    ) : null;
  } else {
    page = (
      <PublicHome
        onBrowse={() => navigate('/auctions')}
        onOpenAuction={(id) => navigate(`/auctions/${encodeURIComponent(id)}`)}
        onOrganise={goOrganise}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-slate-50 text-slate-900 font-sans selection:bg-lime-400 selection:text-slate-950">
      <Navbar currentPage={role === 'ADMIN' ? 'ADMIN' : route.page} onNavigate={navigate} onOpenAccount={goOrganise} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {page}
      </main>

      <footer className="mt-auto bg-slate-950 text-slate-400">
        <div className="h-1 bg-gradient-to-r from-lime-500 via-lime-300 to-lime-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-2">
            <Logo dark tagline="Player Auction Platform" />
            <p className="max-w-sm text-sm leading-relaxed">
              Live player auctions for leagues, clubs and corporate tournaments: bidding, purses, squads and a big-screen broadcast in one place.
            </p>
          </div>
          <FooterLinks title="Explore" links={[['Home', () => navigate('/')], ['Browse auctions', () => navigate('/auctions')], ['How it works', () => navigate('/how-to-use')]]} />
          <FooterLinks title="Organisers" links={[['Organise an auction', goOrganise], ['Pricing', () => navigate('/pricing')], ['Contact us', () => navigate('/contact')]]} />
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs">© {new Date().getFullYear()} Force Pulse · Feel the pulse of every bid.</div>
        </div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {route.resetToken && <LoginModal initialMode="RESET" resetToken={route.resetToken} onClose={() => navigate('/')} />}
    </div>
  );
};

const FooterLinks = ({ title, links }) => (
  <nav className="space-y-3" aria-label={title}>
    <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">{title}</h3>
    <ul className="space-y-2 text-sm">
      {links.map(([label, onClick]) => (
        <li key={label}><button onClick={onClick} className="hover:text-lime-400 transition-colors">{label}</button></li>
      ))}
    </ul>
  </nav>
);

// Nothing renders until the account and auctions have arrived from the server
const Loaded = ({ children }) => {
  const { loaded } = useAuction();
  if (!loaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${screen ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
          <LogoMark className="w-12 h-12 animate-pulse" />
          Loading Force Pulse…
        </div>
      </div>
    );
  }
  return children;
};

export default function App() {
  return (
    <AuctionProvider>
      <Loaded>{screen ? <ScreenApp /> : <AppContent />}</Loaded>
    </AuctionProvider>
  );
}
