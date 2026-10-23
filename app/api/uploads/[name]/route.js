import { readFile } from 'fs/promises';
import path from 'path';
import { uploadDir } from '../route.js';

export const dynamic = 'force-dynamic';

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// Only names the upload route creates (uuid.ext), so no path can reach outside the uploads folder
const NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function GET(_request, { params }) {
  const match = NAME.exec(params.name || '');
  if (!match) return new Response('Not found', { status: 404 });
  try {
    const body = await readFile(path.join(uploadDir(), match[0]));
    // Each upload gets a new name, so a file never changes and can be cached for good
    return new Response(body, { headers: { 'Content-Type': TYPES[match[1]], 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
