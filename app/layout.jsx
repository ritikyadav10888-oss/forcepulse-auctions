import '../src/index.css';

export const metadata = {
  title: 'Force Pulse — Player Auctions',
  description: 'Run live player auctions: teams, purses, bidding, venue screens and stream overlays.'
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-lime-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
