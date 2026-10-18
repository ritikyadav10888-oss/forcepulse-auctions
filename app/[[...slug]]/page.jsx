'use client';

import dynamic from 'next/dynamic';

// The auction app runs in the browser (hash routes, ?screen= links, live sockets)
const App = dynamic(() => import('../../src/App.jsx'), {
  ssr: false,
  loading: () => <div className="min-h-screen" />
});

export default function Page() {
  return <App />;
}
