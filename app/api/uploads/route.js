import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getRequestUser } from '../../../lib/server/auth.js';
import { clientIp, json, rateLimited } from '../../../lib/server/http.js';

export const dynamic = 'force-dynamic';

// Where photos, logos and backgrounds are kept: UPLOAD_DIR in Docker (/data/uploads), else ./uploads
export const uploadDir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// The browser scales images down before sending, so anything bigger than this is not from the app
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Saves one image and returns its URL. Open to visitors too: player self-registration uploads a photo before signing in.
export async function POST(request) {
  const user = await getRequestUser(request);
  if (rateLimited(`upload:${user?.id || clientIp(request)}`, user ? 200 : 20)) {
    return json({ error: 'Too many uploads. Please wait a few minutes and try again.' }, 429);
  }

  let file;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const ext = file && typeof file === 'object' ? EXTENSIONS[file.type] : null;
  if (!ext) return json({ error: 'Please choose an image file (PNG, JPG or WebP).' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'That image is too large. Please choose a smaller one.' }, 413);

  const name = `${randomUUID()}.${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), Buffer.from(await file.arrayBuffer()));
  return json({ url: `/api/uploads/${name}` }, 201);
}
