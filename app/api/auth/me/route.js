import { getRequestUser, publicUser } from '../../../../lib/server/auth.js';
import { json } from '../../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return json({ user: publicUser(await getRequestUser(request)) });
}
