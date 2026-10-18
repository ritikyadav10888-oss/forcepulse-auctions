import { getRequestUser } from '../../../lib/server/auth.js';
import { json } from '../../../lib/server/http.js';
import { loadState } from '../../../lib/server/store.js';

export const dynamic = 'force-dynamic';

// Everything this visitor may see. ?auction=<id> also includes that auction (screen links, shared links).
export async function GET(request) {
  const user = await getRequestUser(request);
  const requested = new URL(request.url).searchParams.get('auction');
  return json(await loadState(user, requested));
}
