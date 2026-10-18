// Force Pulse server: Next.js app + API, plus Socket.IO for live bids on every screen.
//   npm run dev     development (hot reload)
//   npm run build && npm start     production
import { createServer } from 'node:http';
import next from 'next';
import nextEnv from '@next/env';
import { Server } from 'socket.io';

nextEnv.loadEnvConfig(process.cwd());

const dev = !process.argv.includes('--prod');
if (!dev) process.env.NODE_ENV = 'production';
const port = Number(process.env.PORT) || 3000;

const { prisma } = await import('./lib/server/db.js');
const { ensureAdminFromEnv, tokenFromCookies, userFromToken } = await import('./lib/server/auth.js');

const app = next({ dev });
const handle = app.getRequestHandler();
await app.prepare();
await ensureAdminFromEnv();

const server = createServer((req, res) => handle(req, res));
const io = new Server(server);
globalThis.__fpIo = io; // API routes broadcast through this

// Rooms: 'public' (public auctions), 'auction:<id>' (screens of one auction),
// 'user:<email>' (an organiser's own auctions), 'admins' (Force Pulse)
io.on('connection', async (socket) => {
  socket.join('public');
  const user = await userFromToken(tokenFromCookies(socket.handshake.headers.cookie)).catch(() => null);
  if (user) {
    socket.join(`user:${user.email}`);
    if (user.isSuperAdmin) socket.join('admins');
  }
  // A screen or page follows the auctions it has loaded (knowing the id is enough, like a shared link)
  socket.on('watch', (ids) => {
    if (!Array.isArray(ids)) return;
    for (const id of ids.slice(0, 200)) if (typeof id === 'string') socket.join(`auction:${id}`);
  });
});

server.listen(port, () => {
  console.log(`> Force Pulse ready on http://localhost:${port} (${dev ? 'development' : 'production'})`);
});

const shutdown = async () => {
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
