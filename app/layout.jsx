import '../src/index.css';

export const metadata = {
  title: 'Force Pulse — Player Auctions',
  description: 'Run live player auctions: teams, purses, bidding, venue screens and stream overlays.'
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* The stream overlay is transparent from the first paint: vMix, unlike OBS, adds no transparent page CSS */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){var q=new URLSearchParams(location.search);if(q.get('screen')==='overlay'&&q.get('bg')!=='green'){var s=document.createElement('style');s.textContent='html,body{background:transparent!important}';document.head.appendChild(s);}})();"
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-lime-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
