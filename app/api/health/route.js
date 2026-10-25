import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '../../../lib/server/db.js';
import { json } from '../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Id of the build being served; open pages compare it with the one they loaded to know a new version is out.
// Read once: it only changes when the app is rebuilt and restarted.
let buildId = null;
try {
  buildId = readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
} catch {}

// Liveness check for Docker / uptime monitors: the app answers and the database responds
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, build: buildId });
  } catch {
    return json({ ok: false, build: buildId }, 503);
  }
}
