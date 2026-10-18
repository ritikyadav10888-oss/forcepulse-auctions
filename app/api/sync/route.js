import { getRequestUser } from '../../../lib/server/auth.js';
import { json, readJson } from '../../../lib/server/http.js';
import { applySync, SyncError } from '../../../lib/server/store.js';

export const dynamic = 'force-dynamic';

// Saves a batch of record changes from the app and pushes them to every other open screen
export async function POST(request) {
  const user = await getRequestUser(request);
  const body = await readJson(request);
  try {
    await applySync(user, body?.changes, request.headers.get('x-client-id'));
    return json({ ok: true });
  } catch (err) {
    if (err instanceof SyncError) return json({ error: err.message }, err.status);
    console.error('[force-pulse] sync failed', err);
    return json({ error: 'Could not save the change. Please try again.' }, 500);
  }
}
