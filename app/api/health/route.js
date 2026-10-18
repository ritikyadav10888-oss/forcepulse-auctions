import { prisma } from '../../../lib/server/db.js';
import { json } from '../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Liveness check for Docker / uptime monitors: the app answers and the database responds
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
}
